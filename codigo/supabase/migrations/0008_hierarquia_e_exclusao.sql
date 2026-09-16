-- ==========================================================================
-- Hierarquia de acesso mais granular + exclusão lógica de lançamentos
--
-- 1. papel ganha um terceiro valor: "lancador" (cria/edita, não exclui)
-- 2. alcance_unidades: própria unidade | todas | específicas liberadas
-- 3. tabela perfil_unidades_extra: quais unidades extras cada perfil recebeu
-- 4. minhas_unidades_permitidas(): substitui minha_unidade_id() na RLS
-- 5. soft delete em remanejamentos (excluido/excluido_em/excluido_por)
-- 6. admin pode criar/gerenciar unidades (leitura já era livre desde 0006)
--
-- Rode DEPOIS de 0007_corrige_recursao_perfil_admin.sql.
-- ==========================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1 — papel: adiciona "lancador"                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table perfis drop constraint if exists perfis_papel_check;
alter table perfis add constraint perfis_papel_check
  check (papel in ('visualizador', 'lancador', 'operador'));

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2 — alcance_unidades                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table perfis add column if not exists alcance_unidades text
  not null default 'propria'
  check (alcance_unidades in ('propria', 'todas', 'especificas'));

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3 — Unidades extras liberadas (só usado quando alcance = 'especificas')  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists perfil_unidades_extra (
  perfil_id  uuid    references perfis(id)   on delete cascade,
  unidade_id integer references unidades(id) on delete cascade,
  primary key (perfil_id, unidade_id)
);

alter table perfil_unidades_extra enable row level security;

drop policy if exists perfil_unidades_extra_admin on perfil_unidades_extra;
create policy perfil_unidades_extra_admin on perfil_unidades_extra
  for all using (sou_admin()) with check (sou_admin());

drop policy if exists perfil_unidades_extra_leitura_propria on perfil_unidades_extra;
create policy perfil_unidades_extra_leitura_propria on perfil_unidades_extra
  for select using (perfil_id = auth.uid());

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4 — Funções: quais unidades o usuário logado pode ver                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function minhas_unidades_permitidas()
returns table(unidade_id integer)
language sql
stable
security definer
set search_path = public
as $$
  select id from unidades
  where exists (
    select 1 from perfis where id = auth.uid() and alcance_unidades = 'todas'
  )
  union
  select unidade_id from perfis
  where id = auth.uid() and unidade_id is not null
  union
  select unidade_id from perfil_unidades_extra
  where perfil_id = auth.uid();
$$;

create or replace function minhas_unidades_permitidas_detalhe()
returns table(id integer, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.nome from unidades u
  where u.id in (select unidade_id from minhas_unidades_permitidas());
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5 — Reescreve as policies de dado por unidade                           ║
-- ║   (antes: unidade_id = minha_unidade_id() — só a unidade de casa)        ║
-- ║   (agora: unidade_id in minhas_unidades_permitidas() — cobre os 3 casos) ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

do $$
declare t text;
begin
  foreach t in array array[
    'setores','turnos','supervisores','profissionais',
    'regioes_corporais','segmentos',
    'colaboradores','remanejamentos'
  ]
  loop
    execute format('drop policy if exists equipe_unidade on %I', t);
    execute format(
      'create policy equipe_unidade on %I for all
         using (e_equipe() and unidade_id in (select unidade_id from minhas_unidades_permitidas()))
         with check (e_equipe() and unidade_id in (select unidade_id from minhas_unidades_permitidas()))', t
    );
  end loop;
end;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 6 — Soft delete em remanejamentos                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table remanejamentos add column if not exists excluido boolean not null default false;
alter table remanejamentos add column if not exists excluido_em timestamptz;
alter table remanejamentos add column if not exists excluido_por uuid references perfis(id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 7 — Admin pode criar/gerenciar unidades                                  ║
-- ║   (leitura de todas as unidades já era livre para a equipe desde 0006)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

drop policy if exists unidades_admin on unidades;
create policy unidades_admin on unidades
  for all using (sou_admin()) with check (sou_admin());

notify pgrst, 'reload schema';
