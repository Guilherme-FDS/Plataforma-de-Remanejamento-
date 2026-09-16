-- ==========================================================================
-- Recria vw_remanejamentos para enxergar as colunas novas
--
-- A view é definida com `select r.*`. O PostgreSQL expande esse `*` no
-- momento da CRIAÇÃO da view e congela a lista de colunas — colunas
-- adicionadas na tabela depois NÃO aparecem sozinhas.
--
-- Por isso, depois da 0006 (unidade_id) e da 0008 (excluido, excluido_em,
-- excluido_por), a view continuava com a lista de colunas da 0001, e o app
-- quebrava com:
--   column vw_remanejamentos.excluido does not exist
--
-- CREATE OR REPLACE VIEW não resolve: ele só aceita acrescentar colunas no
-- fim da lista, e as novas entram no meio (na posição em que estão na
-- tabela). Por isso é DROP + CREATE.
--
-- Rode DEPOIS de 0009_endurece_funcoes.sql.
-- ==========================================================================

drop view if exists vw_remanejamentos;

-- security_invoker NÃO é opcional. Sem ele a view roda com os privilégios de
-- quem a criou (o papel `postgres` do SQL Editor), que IGNORA RLS — e a view
-- vira um furo que devolve todos os dados clínicos para a anon key.
create view vw_remanejamentos with (security_invoker = true) as
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

notify pgrst, 'reload schema';
