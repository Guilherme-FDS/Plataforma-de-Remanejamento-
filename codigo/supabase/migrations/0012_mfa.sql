-- ==========================================================================
-- MFA (segundo fator) exigido pelo banco
--
-- POR QUE NO BANCO, E NÃO SÓ NA TELA
--
-- Exigir MFA no login protege quem entra pela tela. A `anon key` é pública,
-- então um token obtido só com senha (AAL1) fala com o PostgREST do mesmo
-- jeito. Se a exigência não estiver na policy, senha vazada continua sendo
-- acesso total ao dado de saúde — que é exatamente o risco que o MFA existe
-- para cobrir.
--
-- COMO A TRANSIÇÃO ACONTECE SEM TRANCAR A EQUIPE DO LADO DE FORA
--
-- `mfa_ok()` tem três estados:
--
--   1. Sessão já é AAL2 (senha + código)          -> libera sempre.
--   2. Pessoa AINDA não cadastrou fator nenhum    -> libera, se o modo
--      obrigatório estiver desligado (período de adesão).
--   3. Pessoa TEM fator cadastrado mas entrou só  -> BLOQUEIA. Quem aderiu
--      com senha                                     não perde a proteção.
--
-- O item 3 é o que faz o MFA valer desde o primeiro usuário que adere, sem
-- depender de todos aderirem juntos. Quando a última pessoa tiver cadastrado,
-- ligue o modo obrigatório em Configurações → Segurança (ou pelo SQL do
-- Bloco 2) e o estado 2 deixa de liberar.
--
-- O QUE NÃO É PROTEGIDO POR MFA, DE PROPÓSITO: `perfis` (linha própria) e
-- `unidades`. São o que o app precisa ler para desenhar o menu e a tela que
-- pede o cadastro do segundo fator. Nenhuma das duas tem dado clínico.
--
-- Rode DEPOIS de 0011_papel_na_rls.sql.
-- ==========================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1 — Configuração global da plataforma                                    ║
-- ║   Linha única. Existe para o admin ligar o modo obrigatório pela tela,   ║
-- ║   sem precisar de nova migration.                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists configuracoes (
  id               boolean primary key default true check (id),
  mfa_obrigatorio  boolean not null default false,
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid references perfis(id)
);

comment on table configuracoes is
  'Linha única (o check em id garante isso). Ajustes que valem para a '
  'plataforma inteira, não para uma unidade.';

insert into configuracoes (id) values (true) on conflict (id) do nothing;

alter table configuracoes enable row level security;

drop policy if exists configuracoes_select on configuracoes;
create policy configuracoes_select on configuracoes
  for select using (e_equipe());

drop policy if exists configuracoes_update on configuracoes;
create policy configuracoes_update on configuracoes
  for update using (sou_admin()) with check (sou_admin());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2 — Helpers                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- `auth.mfa_factors` não é legível pelo papel `authenticated`. SECURITY
-- DEFINER é o que permite a policy consultar essa tabela.
create or replace function tenho_mfa()
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1 from auth.mfa_factors
    where user_id = auth.uid() and status = 'verified'
  );
$$;

create or replace function mfa_obrigatorio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select mfa_obrigatorio from configuracoes where id), false);
$$;

/*
 * AAL = Authenticator Assurance Level, gravado pelo GoTrue no próprio JWT.
 *   aal1 = só senha
 *   aal2 = senha + segundo fator verificado nesta sessão
 *
 * Ler do JWT (e não de uma tabela) é o que torna a checagem imune a
 * sessão antiga: um token emitido antes do MFA continua sendo aal1 e não
 * passa, mesmo que o fator exista.
 */
create or replace function mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then true
    when tenho_mfa()                                     then false
    else not mfa_obrigatorio()
  end;
$$;

revoke execute on function tenho_mfa()        from anon;
revoke execute on function mfa_obrigatorio()  from anon;
revoke execute on function mfa_ok()           from anon;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3 — As policies de dado passam a exigir mfa_ok()                         ║
-- ║   Mesmas policies da 0011, com a exigência somada. Recriadas inteiras    ║
-- ║   porque policy no Postgres não tem ALTER que acrescente predicado.      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Dado clínico: leitura para a equipe, escrita para lançador/operador.
do $$
declare t text;
begin
  foreach t in array array['colaboradores', 'remanejamentos']
  loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format('drop policy if exists %I on %I', t || '_update', t);

    execute format(
      'create policy %I on %I for select
         using (e_equipe() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_select', t);

    execute format(
      'create policy %I on %I for insert
         with check (pode_lancar() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_insert', t);

    execute format(
      'create policy %I on %I for update
         using (pode_lancar() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))
         with check (pode_lancar() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_update', t);
  end loop;
end;
$$;

-- Listas de domínio: leitura para a equipe, escrita só para operador.
do $$
declare t text;
begin
  foreach t in array array[
    'setores', 'turnos', 'supervisores', 'profissionais',
    'regioes_corporais', 'segmentos'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format('drop policy if exists %I on %I', t || '_update', t);

    execute format(
      'create policy %I on %I for select
         using (e_equipe() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_select', t);

    execute format(
      'create policy %I on %I for insert
         with check (pode_operar() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_insert', t);

    execute format(
      'create policy %I on %I for update
         using (pode_operar() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))
         with check (pode_operar() and mfa_ok()
                and unidade_id in (select unidade_id from minhas_unidades_permitidas()))',
      t || '_update', t);
  end loop;
end;
$$;

-- contraindicacoes_modelo
drop policy if exists contraindicacoes_select on contraindicacoes_modelo;
drop policy if exists contraindicacoes_insert on contraindicacoes_modelo;
drop policy if exists contraindicacoes_update on contraindicacoes_modelo;

create policy contraindicacoes_select on contraindicacoes_modelo
  for select using (e_equipe() and mfa_ok());
create policy contraindicacoes_insert on contraindicacoes_modelo
  for insert with check (pode_lancar() and mfa_ok());
create policy contraindicacoes_update on contraindicacoes_modelo
  for update using (pode_lancar() and mfa_ok()) with check (pode_lancar() and mfa_ok());

-- importacao_pendencias (traz nome de colaborador e motivo clínico)
drop policy if exists pendencias_select on importacao_pendencias;
drop policy if exists pendencias_update on importacao_pendencias;

create policy pendencias_select on importacao_pendencias
  for select using (e_equipe() and mfa_ok());
create policy pendencias_update on importacao_pendencias
  for update using (pode_lancar() and mfa_ok()) with check (pode_lancar() and mfa_ok());

-- auditoria (guarda o registro inteiro em jsonb — é dado clínico também)
drop policy if exists auditoria_leitura on auditoria;
create policy auditoria_leitura on auditoria
  for select using (e_equipe() and mfa_ok());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4 — Conferência                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Quem já aderiu ao MFA:
--   select p.nome, p.papel, (select count(*) from auth.mfa_factors f
--                             where f.user_id = p.id and f.status = 'verified') as fatores
--     from perfis p where p.ativo order by fatores, p.nome;
--
-- Ligar o modo obrigatório (só depois de a coluna acima não ter mais zeros):
--   update configuracoes set mfa_obrigatorio = true, atualizado_em = now() where id;

notify pgrst, 'reload schema';
