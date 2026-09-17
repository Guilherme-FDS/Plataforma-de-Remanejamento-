-- ==========================================================================
-- Auditoria de `configuracoes` — inclusive `mfa_obrigatorio`
--
-- A tabela guardava só o último `atualizado_por`/`atualizado_em`: dava pra
-- ver o estado atual, não o histórico. Se alguém ligar e desligar a
-- exigência de MFA duas vezes na mesma tarde, a coluna só mostra a última.
--
-- `registrar_auditoria()` (0011) já é genérica — grava tabela, ação, quem e
-- o registro antes/depois em jsonb. Só faltava a trigger nesta tabela.
--
-- Rode DEPOIS de 0013_adesao_mfa.sql.
-- ==========================================================================

drop trigger if exists auditoria_configuracoes on configuracoes;
create trigger auditoria_configuracoes
  after insert or update on configuracoes
  for each row execute function registrar_auditoria();

notify pgrst, 'reload schema';
