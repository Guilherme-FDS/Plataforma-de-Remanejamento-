-- ==========================================================================
-- Melhorias: papel do usuário
--
-- Rode DEPOIS de 0004_fidelidade.sql.
-- ==========================================================================

-- Distingue quem só lê de quem pode criar/editar/encerrar.
alter table perfis
  add column if not exists papel text not null default 'operador'
  check (papel in ('operador', 'visualizador'));

comment on column perfis.papel is
  'operador: cria, edita e encerra casos. visualizador: só lê e exporta relatórios.';

notify pgrst, 'reload schema';
