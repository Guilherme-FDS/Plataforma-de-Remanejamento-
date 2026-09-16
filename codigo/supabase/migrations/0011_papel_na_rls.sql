-- ==========================================================================
-- O papel do usuário passa a valer no banco, não só no TypeScript
--
-- PROBLEMA QUE ESTA MIGRATION FECHA
--
-- Até aqui as policies eram `for all using (e_equipe() and unidade_id in
-- (...))`. Elas conferiam se a pessoa é da equipe e se a unidade está
-- liberada — mas NÃO olhavam `perfis.papel`. A distinção entre
-- visualizador, lançador e operador existia apenas nas Server Actions.
--
-- Como a `anon key` é pública e vai no bundle do navegador, qualquer
-- pessoa logada podia ignorar a tela e falar direto com o PostgREST:
--
--   POST /rest/v1/remanejamentos      (com o próprio token de visualizador)
--   DELETE /rest/v1/remanejamentos?id=eq.42
--
-- e escrever ou apagar dado clínico. A hierarquia de acesso era decorativa.
--
-- O QUE MUDA
--
-- 1. Helpers pode_lancar() / pode_operar(), no mesmo molde de e_equipe().
-- 2. Cada policy `for all` vira policies separadas por operação:
--       SELECT  -> toda a equipe ativa (dentro das unidades permitidas)
--       INSERT  -> lançador ou operador (listas de domínio: só operador)
--       UPDATE  -> idem
--       DELETE  -> ninguém
-- 3. DELETE físico deixa de existir para dado clínico. A exclusão do
--    produto é lógica (`excluido = true`, migration 0008) e continua
--    funcionando: ela é um UPDATE.
-- 4. `perfis` deixa de ser legível por toda a equipe — cada um lê o
--    próprio, admin lê todos.
-- 5. registrar_auditoria() para de quebrar em DELETE.
--
-- Rode DEPOIS de 0010_recria_view_remanejamentos.sql.
-- ==========================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1 — Helpers de papel                                                     ║
-- ║                                                                          ║
-- ║ SECURITY DEFINER pelo mesmo motivo de e_equipe(): a policy precisa ler   ║
-- ║ `perfis` sem depender de o usuário ter permissão de leitura nela — e     ║
-- ║ sem isso a avaliação da policy de `perfis` recursiona (ver 0007).        ║
-- ║                                                                          ║
-- ║ Fail-safe: papel desconhecido, nulo ou perfil inativo devolve FALSE.     ║
-- ║ Espelha a decisão já tomada em actions/remanejamentos.ts — liberar por   ║
-- ║ lista explícita, nunca por exclusão do "visualizador".                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function meu_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from perfis where id = auth.uid() and ativo;
$$;

create or replace function pode_lancar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(meu_papel() in ('lancador', 'operador'), false);
$$;

create or replace function pode_operar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(meu_papel() = 'operador', false);
$$;

-- Mesma regra da 0009: sem sessão, todas já devolvem vazio/falso — revogar
-- de `anon` é fechar a porta, não tapar vazamento. `authenticated` PRECISA
-- manter o EXECUTE: as policies rodam com o papel de quem consulta.
revoke execute on function meu_papel()   from anon;
revoke execute on function pode_lancar() from anon;
revoke execute on function pode_operar() from anon;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2 — Dado clínico: colaboradores e remanejamentos                         ║
-- ║   Leitura: toda a equipe. Escrita: lançador ou operador.                 ║
-- ║   Exclusão física: ninguém — a do produto é lógica.                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

do $$
declare t text;
begin
  foreach t in array array['colaboradores', 'remanejamentos']
  loop
    execute format('drop policy if exists equipe_unidade on %I', t);
    execute format('drop policy if exists equipe_total on %I', t);

    execute format(
      'create policy %I on %I for select
         using (e_equipe()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_select', t);

    execute format(
      'create policy %I on %I for insert
         with check (pode_lancar()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_insert', t);

    -- USING e WITH CHECK: sem o WITH CHECK, um UPDATE poderia mover a linha
    -- para uma unidade a que a pessoa não tem acesso.
    execute format(
      'create policy %I on %I for update
         using (pode_lancar()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))
         with check (pode_lancar()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_update', t);

    -- Nenhuma policy de DELETE. Sem policy, a operação é negada.
  end loop;
end;
$$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3 — Listas de domínio: só operador escreve                               ║
-- ║   Espelha verificarOperador() em app/actions/admin.ts — mexer em setor   ║
-- ║   ou segmento é estrutural, muda o significado de todo o histórico.      ║
-- ║   Desativar item é UPDATE de `ativo`, então DELETE também não precisa.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

do $$
declare t text;
begin
  foreach t in array array[
    'setores', 'turnos', 'supervisores', 'profissionais',
    'regioes_corporais', 'segmentos'
  ]
  loop
    execute format('drop policy if exists equipe_unidade on %I', t);
    execute format('drop policy if exists equipe_total on %I', t);

    execute format(
      'create policy %I on %I for select
         using (e_equipe()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_select', t);

    execute format(
      'create policy %I on %I for insert
         with check (pode_operar()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_insert', t);

    execute format(
      'create policy %I on %I for update
         using (pode_operar()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))
         with check (pode_operar()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_update', t);
  end loop;
end;
$$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4 — contraindicacoes_modelo                                              ║
-- ║   Não tem unidade_id: o vínculo é a FK para segmentos, cuja policy já    ║
-- ║   filtra por unidade. O que faltava era o papel.                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

drop policy if exists equipe_total on contraindicacoes_modelo;

create policy contraindicacoes_select on contraindicacoes_modelo
  for select using (e_equipe());

create policy contraindicacoes_insert on contraindicacoes_modelo
  for insert with check (pode_lancar());

create policy contraindicacoes_update on contraindicacoes_modelo
  for update using (pode_lancar()) with check (pode_lancar());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5 — importacao_pendencias                                                ║
-- ║   Resolver/reabrir é UPDATE (app/actions/pendencias.ts). As linhas       ║
-- ║   nascem da migration 0003, rodada como `postgres`, que passa por cima   ║
-- ║   da RLS — então a aplicação não precisa de INSERT nem DELETE.           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

drop policy if exists equipe_total on importacao_pendencias;

create policy pendencias_select on importacao_pendencias
  for select using (e_equipe());

create policy pendencias_update on importacao_pendencias
  for update using (pode_lancar()) with check (pode_lancar());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 6 — perfis: cada um lê o próprio; admin lê e gerencia todos              ║
-- ║                                                                          ║
-- ║ A policy da 0001 era `using (id = auth.uid() or e_equipe())` — ou seja,  ║
-- ║ qualquer pessoa da equipe lia nome, função, papel e flag de admin de     ║
-- ║ TODO mundo. Nada do app depende disso: as leituras de perfis ou são da   ║
-- ║ própria linha (`.eq("id", user.id)`) ou estão dentro de uma action já    ║
-- ║ restrita a admin, que passa pela policy perfil_admin.                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

drop policy if exists perfil_proprio on perfis;

create policy perfil_proprio on perfis
  for select using (id = auth.uid());

-- perfil_admin (0007) continua como está: for all using/with check sou_admin().
-- É ela que sustenta a tela de Usuários.


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 7 — Auditoria: parar de quebrar em DELETE                                ║
-- ║                                                                          ║
-- ║ `coalesce(new.id, old.id)` assume que NEW existe. Em trigger de DELETE   ║
-- ║ o PL/pgSQL não atribui NEW, e a referência levanta                       ║
-- ║ "record new is not assigned yet" — ou seja, a trigger de auditoria       ║
-- ║ abortava justamente a operação mais sensível de registrar.               ║
-- ║                                                                          ║
-- ║ Depois do bloco 2 nenhum DELETE chega pela aplicação, mas a trigger      ║
-- ║ também roda para o que for feito pelo SQL Editor — que é exatamente      ║
-- ║ quando se quer o registro.                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_id := old.id::text;
  else
    v_id := new.id::text;
  end if;

  insert into auditoria (tabela, registro_id, acao, usuario_id,
                         dados_antes, dados_depois)
  values (
    tg_table_name,
    v_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function registrar_auditoria() from anon, authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 8 — Conferência                                                          ║
-- ║   Rode e leia o resultado. Toda tabela de dado tem de aparecer com       ║
-- ║   policies de select/insert/update e NENHUMA de delete.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- select tablename, policyname, cmd
--   from pg_policies
--  where schemaname = 'public'
--  order by tablename, cmd;

notify pgrst, 'reload schema';
