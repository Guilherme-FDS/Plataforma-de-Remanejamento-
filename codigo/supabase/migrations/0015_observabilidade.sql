-- ==========================================================================
-- Observabilidade mínima — erros de aplicação ficam visíveis pro admin
--
-- POR QUE ISTO EXISTE
--
-- O incidente de MFA de 17/09 só foi percebido porque alguém reclamou. Os
-- catches em `perfilAtual()` e `estadoMfa()` (lib/dados.ts, lib/mfa.ts)
-- ganharam `console.error()` no mesmo dia, mas log de servidor só ajuda
-- quem tem acesso ao painel da Vercel e lembra de olhar. Isto guarda o
-- mesmo tipo de falha numa tabela que o admin vê dentro do próprio app.
--
-- NÃO é um substituto de Sentry/observabilidade de verdade — não agrega,
-- não alerta, não tem retenção configurável. É o mínimo que dá pra ter sem
-- depender de outra conta/serviço externo.
--
-- Rode DEPOIS de 0014_audita_configuracoes.sql.
-- ==========================================================================

create table if not exists erros_aplicacao (
  id           bigint generated always as identity primary key,
  ocorrido_em  timestamptz not null default now(),
  -- de onde veio: nome de função/componente, não stack trace inteira —
  -- stack trace de client component pode conter dado da tela.
  contexto     text not null check (char_length(contexto) <= 200),
  mensagem     text not null check (char_length(mensagem) <= 2000),
  usuario_id   uuid references perfis(id),
  rota         text
);

comment on table erros_aplicacao is
  'Log mínimo de falhas — perfilAtual(), estadoMfa() e outros catches '
  'relevantes gravam aqui além de console.error(). Só admin lê.';

alter table erros_aplicacao enable row level security;

-- Insert liberado mesmo sem sessão: a tela de login roda ANTES de haver
-- usuário, e é exatamente onde o incidente de 17/09 teria aparecido se
-- isto já existisse. Não é um furo de dado — a tabela não guarda nada além
-- do que o próprio app decide logar, e ninguém lê de volta sem ser admin.
drop policy if exists erros_aplicacao_insert on erros_aplicacao;
create policy erros_aplicacao_insert on erros_aplicacao
  for insert with check (true);

drop policy if exists erros_aplicacao_select on erros_aplicacao;
create policy erros_aplicacao_select on erros_aplicacao
  for select using (sou_admin());

-- Sem update nem delete por policy — o log é append-only pela aplicação.
-- Limpeza de linhas antigas, se algum dia precisar, é tarefa de admin via
-- SQL Editor (roda como `postgres`, ignora RLS).

notify pgrst, 'reload schema';
