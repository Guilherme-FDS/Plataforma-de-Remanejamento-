-- ==========================================================================
-- Multi-unidade
--
-- Adiciona suporte a múltiplas unidades (Maringá, Londrina, etc.).
-- Maringá já existe como unidade 1.
--
-- Rode DEPOIS de 0005_melhorias.sql.
-- ==========================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1 — Tabela de unidades                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table unidades (
  id    serial primary key,
  nome  text not null unique,
  ativo boolean not null default true
);

-- Maringá é sempre a unidade 1
insert into unidades (nome) values ('Maringá');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2 — Função auxiliar: retorna a unidade do usuário logado                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function minha_unidade_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select unidade_id from perfis where id = auth.uid();
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3 — Adiciona unidade_id a todas as tabelas relevantes                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table perfis              add column if not exists unidade_id integer references unidades(id);
alter table setores             add column if not exists unidade_id integer references unidades(id);
alter table turnos              add column if not exists unidade_id integer references unidades(id);
alter table supervisores        add column if not exists unidade_id integer references unidades(id);
alter table profissionais       add column if not exists unidade_id integer references unidades(id);
alter table regioes_corporais   add column if not exists unidade_id integer references unidades(id);
alter table segmentos           add column if not exists unidade_id integer references unidades(id);
alter table colaboradores       add column if not exists unidade_id integer references unidades(id);
alter table remanejamentos      add column if not exists unidade_id integer references unidades(id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4 — Migra dados existentes: tudo é Maringá (id = 1)                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

update perfis             set unidade_id = 1 where unidade_id is null;
update setores            set unidade_id = 1 where unidade_id is null;
update turnos             set unidade_id = 1 where unidade_id is null;
update supervisores       set unidade_id = 1 where unidade_id is null;
update profissionais      set unidade_id = 1 where unidade_id is null;
update regioes_corporais  set unidade_id = 1 where unidade_id is null;
update segmentos          set unidade_id = 1 where unidade_id is null;
update colaboradores      set unidade_id = 1 where unidade_id is null;
update remanejamentos     set unidade_id = 1 where unidade_id is null;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5 — NOT NULL nas tabelas de dados (perfis permanece nullable)            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table setores            alter column unidade_id set not null;
alter table turnos             alter column unidade_id set not null;
alter table supervisores       alter column unidade_id set not null;
alter table profissionais      alter column unidade_id set not null;
alter table regioes_corporais  alter column unidade_id set not null;
alter table segmentos          alter column unidade_id set not null;
alter table colaboradores      alter column unidade_id set not null;
alter table remanejamentos     alter column unidade_id set not null;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 6 — Unique constraints: nome único POR unidade                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table setores          drop constraint if exists setores_nome_key;
alter table turnos           drop constraint if exists turnos_nome_key;
alter table supervisores     drop constraint if exists supervisores_nome_key;
alter table profissionais    drop constraint if exists profissionais_nome_key;
alter table regioes_corporais drop constraint if exists regioes_corporais_nome_key;
alter table segmentos        drop constraint if exists segmentos_nome_key;

alter table setores          add constraint setores_nome_unidade_key           unique (nome, unidade_id);
alter table turnos           add constraint turnos_nome_unidade_key            unique (nome, unidade_id);
alter table supervisores     add constraint supervisores_nome_unidade_key      unique (nome, unidade_id);
alter table profissionais    add constraint profissionais_nome_unidade_key     unique (nome, unidade_id);
alter table regioes_corporais add constraint regioes_corporais_nome_unidade_key unique (nome, unidade_id);
alter table segmentos        add constraint segmentos_nome_unidade_key         unique (nome, unidade_id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 7 — RLS: cada usuário enxerga somente a própria unidade                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table unidades enable row level security;

-- Toda a equipe ativa lê unidades (só a própria aparece na prática)
create policy unidades_leitura on unidades
  for select using (e_equipe());

-- Remove as policies genéricas (sem filtro de unidade)
do $$
declare t text;
begin
  foreach t in array array[
    'setores','turnos','supervisores','profissionais',
    'regioes_corporais','segmentos','contraindicacoes_modelo',
    'colaboradores','remanejamentos'
  ]
  loop
    execute format('drop policy if exists equipe_total on %I', t);
  end loop;
end;
$$;

-- Recria com filtro de unidade para as tabelas que têm unidade_id
do $$
declare t text;
begin
  foreach t in array array[
    'setores','turnos','supervisores','profissionais',
    'regioes_corporais','segmentos',
    'colaboradores','remanejamentos'
  ]
  loop
    execute format(
      'create policy equipe_unidade on %I for all
         using (e_equipe() and unidade_id = minha_unidade_id())
         with check (e_equipe() and unidade_id = minha_unidade_id())', t
    );
  end loop;
end;
$$;

-- contraindicacoes_modelo não tem unidade_id; segurança vem via FK de segmentos
create policy equipe_total on contraindicacoes_modelo
  for all using (e_equipe()) with check (e_equipe());

notify pgrst, 'reload schema';
