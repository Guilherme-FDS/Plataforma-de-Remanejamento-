-- ============================================================================
-- Plataforma de Remanejamento — schema inicial
--
-- IMPORTANTE: o editor SQL do Supabase roda o script inteiro numa única
-- transação. Se QUALQUER comando falhar, tudo é desfeito — inclusive o que
-- aparentemente funcionou. Rode UM BLOCO POR VEZ, na ordem, e confira o
-- resultado de cada um antes de seguir.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 1 — Tipos                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create type tipo_restricao as enum (
  'clinico',
  'ocupacional',
  'acidente_trabalho',
  'acidente_domestico',
  'indefinido'
);

create type duracao_tipo as enum (
  'dias',        -- prazo fechado, gera previsão de término
  'permanente',  -- sem prazo; exige reavaliação periódica
  'gestacao',    -- termina por evento, não por data
  'licenca',
  'indefinido'
);

create type lateralidade as enum ('direito', 'esquerdo', 'bilateral');

create type funcao_usuario as enum (
  'medico',
  'enfermeiro',
  'ergonomista',
  'tecnico_seguranca'
);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 2 — Usuários e controle de acesso                                  ║
-- ║                                                                          ║
-- ║ Dado de saúde identificado. Não existe auto-cadastro: um perfil só       ║
-- ║ existe se alguém da equipe criar. DESLIGUE "Enable signup" em            ║
-- ║ Authentication > Providers > Email no painel do Supabase.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table perfis (
  id           uuid primary key references auth.users(id) on delete cascade,
  nome         text not null,
  funcao       funcao_usuario not null,
  registro     text,                     -- CRM / COREN / CREFITO
  admin        boolean not null default false,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

comment on table perfis is
  'Equipe de medicina ocupacional e ergonomia. Todos enxergam diagnóstico; '
  'o que separa é estar ativo, não o cargo.';

-- Usada por todas as policies. SECURITY DEFINER para não exigir que o
-- usuário tenha permissão de leitura na própria tabela de perfis.
create or replace function e_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and ativo
  );
$$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 3 — Listas de domínio                                              ║
-- ║                                                                          ║
-- ║ Existem para que o campo NUNCA seja texto livre. Na planilha havia 35    ║
-- ║ grafias de setor para ~20 setores reais e 39 de supervisor para ~28      ║
-- ║ pessoas — o que tornava qualquer contagem por setor não confiável.       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table setores (
  id        serial primary key,
  nome      text not null unique,
  efetivo   integer,   -- nº de colaboradores; habilita incidência por 100
  ativo     boolean not null default true
);

comment on column setores.efetivo is
  'Sem este número só existe contagem absoluta, que engana: 13 casos num '
  'setor de 400 pessoas é melhor que 6 num de 20.';

create table turnos (
  id     serial primary key,
  nome   text not null unique
);

create table supervisores (
  id        serial primary key,
  nome      text not null unique,
  ativo     boolean not null default true
);

create table profissionais (
  id        serial primary key,
  nome      text not null unique,
  registro  text,
  ativo     boolean not null default true
);

create table regioes_corporais (
  id     serial primary key,
  nome   text not null unique
);

create table segmentos (
  id         serial primary key,
  nome       text not null unique,
  regiao_id  integer not null references regioes_corporais(id),
  ativo      boolean not null default true
);

comment on table segmentos is
  'Segmento é separado de lateralidade: "OMBRO DIREITO", "OMBRO (D)(E)" e '
  '"OMBROS" viram um único segmento + um campo de lado. Sem isso o '
  'indicador por região do corpo não fecha.';

-- Frases de contraindicação reaproveitáveis, por segmento. A mesma
-- orientação era redigitada dezenas de vezes na planilha.
create table contraindicacoes_modelo (
  id           serial primary key,
  segmento_id  integer not null references segmentos(id) on delete cascade,
  texto        text not null,
  usos         integer not null default 0,
  unique (segmento_id, texto)
);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 4 — Colaboradores e remanejamentos                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table colaboradores (
  id              bigserial primary key,
  matricula       integer not null unique,
  nome            text not null,
  setor_id        integer references setores(id),
  turno_id        integer references turnos(id),
  data_admissao   date,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

comment on table colaboradores is
  'Pessoa separada de evento. Na planilha cada linha era um evento solto, '
  'então reincidência só era descoberta no olho.';

create table remanejamentos (
  id                 bigserial primary key,
  colaborador_id     bigint not null references colaboradores(id),

  data_inicio        date not null,
  duracao_tipo       duracao_tipo not null,
  duracao_dias       integer,

  -- Previsão calculada, nunca digitada. Mata o "17//04/2026" e o
  -- encerramento anterior ao início que existiam na planilha.
  data_prevista_fim  date generated always as (
    case
      when duracao_tipo = 'dias' and duracao_dias is not null
      then data_inicio + duracao_dias
      else null
    end
  ) stored,

  -- Data em que o caso foi DE FATO encerrado. A planilha não tinha este
  -- conceito: a coluna ENCERRAMENTO era preenchida no lançamento e,
  -- portanto, era previsão.
  data_encerramento  date,
  encerrado_por      uuid references perfis(id),

  setor_id           integer not null references setores(id),
  turno_id           integer not null references turnos(id),
  supervisor_id      integer references supervisores(id),

  tipo               tipo_restricao not null default 'indefinido',
  causa              text,
  segmento_id        integer references segmentos(id),
  lado               lateralidade,
  contraindicacao    text,
  observacoes        text,
  profissional_id    integer references profissionais(id),

  origem             text not null default 'sistema',  -- 'sistema' | 'planilha'
  linha_origem       integer,                          -- rastreio da importação

  criado_por         uuid references perfis(id),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),

  constraint duracao_dias_coerente check (
    (duracao_tipo = 'dias' and duracao_dias between 1 and 999)
    or (duracao_tipo <> 'dias' and duracao_dias is null)
  ),
  constraint encerramento_apos_inicio check (
    data_encerramento is null or data_encerramento >= data_inicio
  )
);

create index remanejamentos_colaborador_idx on remanejamentos (colaborador_id);
create index remanejamentos_inicio_idx      on remanejamentos (data_inicio desc);
create index remanejamentos_previsao_idx    on remanejamentos (data_prevista_fim)
  where data_encerramento is null;
create index remanejamentos_setor_idx       on remanejamentos (setor_id);
create index remanejamentos_segmento_idx    on remanejamentos (segmento_id);

-- Um colaborador não pode ter dois remanejamentos abertos começando no
-- mesmo dia (foi exatamente a duplicata das linhas 131/135 da planilha).
create unique index remanejamentos_sem_duplicata_idx
  on remanejamentos (colaborador_id, data_inicio);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 5 — Situação derivada                                              ║
-- ║                                                                          ║
-- ║ Não é coluna: depende de CURRENT_DATE, que não é imutável e por isso     ║
-- ║ não pode ser generated. Fica numa função STABLE + view.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function situacao_remanejamento(
  p_duracao_tipo       duracao_tipo,
  p_data_prevista_fim  date,
  p_data_encerramento  date
)
returns text
language sql
stable
as $$
  select case
    when p_data_encerramento is not null           then 'encerrado'
    when p_duracao_tipo = 'permanente'             then 'permanente'
    when p_duracao_tipo in ('gestacao', 'licenca') then 'acompanhamento'
    when p_data_prevista_fim is null               then 'sem_previsao'
    when p_data_prevista_fim >= current_date       then 'em_andamento'
    else 'a_encerrar'   -- prazo venceu e ninguém confirmou o desfecho
  end;
$$;

create view vw_remanejamentos as
select
  r.*,
  c.matricula,
  c.nome                         as colaborador,
  s.nome                         as setor,
  t.nome                         as turno,
  sup.nome                       as supervisor,
  seg.nome                       as segmento,
  reg.nome                       as regiao,
  prof.nome                      as profissional,
  situacao_remanejamento(
    r.duracao_tipo, r.data_prevista_fim, r.data_encerramento
  )                              as situacao,
  r.data_prevista_fim - current_date as dias_ate_fim
from remanejamentos r
join colaboradores      c    on c.id   = r.colaborador_id
join setores            s    on s.id   = r.setor_id
join turnos             t    on t.id   = r.turno_id
left join supervisores  sup  on sup.id = r.supervisor_id
left join segmentos     seg  on seg.id = r.segmento_id
left join regioes_corporais reg on reg.id = seg.regiao_id
left join profissionais prof on prof.id = r.profissional_id;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 6 — Auditoria                                                      ║
-- ║                                                                          ║
-- ║ Obrigatória para dado de saúde: é preciso saber quem leu o quê e quem    ║
-- ║ mudou o quê.                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table auditoria (
  id            bigserial primary key,
  tabela        text not null,
  registro_id   text not null,
  acao          text not null,          -- INSERT | UPDATE | DELETE
  usuario_id    uuid,
  dados_antes   jsonb,
  dados_depois  jsonb,
  criado_em     timestamptz not null default now()
);

create index auditoria_registro_idx on auditoria (tabela, registro_id);
create index auditoria_data_idx     on auditoria (criado_em desc);

create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into auditoria (tabela, registro_id, acao, usuario_id,
                         dados_antes, dados_depois)
  values (
    tg_table_name,
    coalesce(new.id, old.id)::text,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger auditar_remanejamentos
  after insert or update or delete on remanejamentos
  for each row execute function registrar_auditoria();

create trigger auditar_colaboradores
  after insert or update or delete on colaboradores
  for each row execute function registrar_auditoria();

create or replace function tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger remanejamentos_atualizado_em
  before update on remanejamentos
  for each row execute function tocar_atualizado_em();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 7 — Row Level Security                                             ║
-- ║                                                                          ║
-- ║ Sem perfil ativo, nada é visível. Rode este bloco por último: antes      ║
-- ║ dele o banco está aberto a qualquer chave anon.                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table perfis                   enable row level security;
alter table setores                  enable row level security;
alter table turnos                   enable row level security;
alter table supervisores             enable row level security;
alter table profissionais            enable row level security;
alter table regioes_corporais        enable row level security;
alter table segmentos                enable row level security;
alter table contraindicacoes_modelo  enable row level security;
alter table colaboradores            enable row level security;
alter table remanejamentos           enable row level security;
alter table auditoria                enable row level security;

-- Cada um lê o próprio perfil; admin gerencia todos.
create policy perfil_proprio on perfis
  for select using (id = auth.uid() or e_equipe());

create policy perfil_admin on perfis
  for all using (
    exists (select 1 from perfis p
            where p.id = auth.uid() and p.admin and p.ativo)
  );

-- Toda a equipe ativa lê e escreve os dados clínicos.
do $$
declare
  t text;
begin
  foreach t in array array[
    'setores', 'turnos', 'supervisores', 'profissionais',
    'regioes_corporais', 'segmentos', 'contraindicacoes_modelo',
    'colaboradores', 'remanejamentos'
  ]
  loop
    execute format(
      'create policy equipe_total on %I for all
         using (e_equipe()) with check (e_equipe())', t
    );
  end loop;
end;
$$;

-- Auditoria é somente leitura pela aplicação: quem escreve é o trigger,
-- que roda como SECURITY DEFINER.
create policy auditoria_leitura on auditoria
  for select using (e_equipe());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCO 8 — Recarregar o cache do PostgREST                                ║
-- ║                                                                          ║
-- ║ Sem isto o PostgREST pode continuar servindo o schema antigo e a         ║
-- ║ aplicação reclama de "coluna não existe".                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

notify pgrst, 'reload schema';
