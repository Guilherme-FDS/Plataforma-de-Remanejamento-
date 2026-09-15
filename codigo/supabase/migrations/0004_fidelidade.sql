-- ==========================================================================
-- Fidelidade à planilha: entram os 4 registros que o schema barrava
-- GERADO por scripts/gerar_0004.py. Não edite à mão.
--
-- Rode DEPOIS de 0003_pendencias.sql.
-- ==========================================================================

-- BLOCO A — schema aceita o que a planilha realmente tem

-- Matrícula ausente é dado que falta, não motivo para a pessoa sumir.
alter table colaboradores alter column matricula drop not null;

-- Duplicata é um fato da planilha: passa a ser sinalizada, não
-- bloqueada. O índice único impedia o registro de existir.
drop index if exists remanejamentos_sem_duplicata_idx;

alter table remanejamentos
  add column if not exists possivel_duplicata_de bigint
  references remanejamentos(id);

-- O índice novo só entra no BLOCO D, depois de a duplicata ser inserida
-- e marcada. Criado aqui, ele barraria a própria inserção.

-- BLOCO B — as 3 pessoas sem matrícula

insert into colaboradores (matricula, nome, setor_id, turno_id) values
  (null, 'Aline Ribeiro', (select id from setores where nome = 'Evisceração'), (select id from turnos where nome = '2º')),
  (null, 'Joao Victor Viera da Silva', (select id from setores where nome = 'Plataforma'), (select id from turnos where nome = '2º')),
  (null, 'Cristina Rosario da Silva', (select id from setores where nome = 'Evisceração'), (select id from turnos where nome = '1º'));

-- BLOCO C — os 4 remanejamentos

insert into remanejamentos (colaborador_id, data_inicio, duracao_tipo, duracao_dias, data_encerramento, setor_id, turno_id, supervisor_id, tipo, causa, segmento_id, lado, contraindicacao, observacoes, profissional_id, origem, linha_origem) values
  ((select id from colaboradores where matricula is null and nome = 'Aline Ribeiro'), date '2025-03-25', 'permanente'::duracao_tipo, null, null, (select id from setores where nome = 'Evisceração'), (select id from turnos where nome = '2º'), (select id from supervisores where nome = 'Anderson Felipe'), 'clinico'::tipo_restricao, 'APRESENTA DESMAIOS FREQUENTES, USA MEDICAMENTO PARA TAG, SEM ACOMPANHAMENTO MEDICO', (select id from segmentos where nome = 'Psicológico'), null::lateralidade, 'ATIVIDADES QUE A MESMA NÃO FIQUE EM ALTURA', null, (select id from profissionais where nome = 'Paola'), 'planilha', 28),
  ((select id from colaboradores where matricula is null and nome = 'Joao Victor Viera da Silva'), date '2025-06-11', 'permanente'::duracao_tipo, null, null, (select id from setores where nome = 'Plataforma'), (select id from turnos where nome = '2º'), (select id from supervisores where nome = 'Anderson Felipe'), 'clinico'::tipo_restricao, 'DEPRESSÃO', (select id from segmentos where nome = 'Psicológico'), null::lateralidade, 'EVITAR QUALQUER ATIVIDADE ENVOLVENDO USO DE FACAS E LOCAIS COM RISCO DE QUEDA', null, (select id from profissionais where nome = 'Rodrigo'), 'planilha', 45),
  ((select id from colaboradores where matricula is null and nome = 'Cristina Rosario da Silva'), date '2025-08-20', 'dias'::duracao_tipo, 90, date '2025-11-30', (select id from setores where nome = 'Evisceração'), (select id from turnos where nome = '1º'), (select id from supervisores where nome = 'Jeferson'), 'clinico'::tipo_restricao, 'LABIRINTITE', (select id from segmentos where nome = 'Labirintite'), null::lateralidade, 'EVITAR SUBIR EM DEGRAUS, PLATAFORMAS', null, (select id from profissionais where nome = 'Vinícius'), 'planilha', 73),
  ((select id from colaboradores where matricula = 58316), date '2026-04-17', 'dias'::duracao_tipo, 60, null, (select id from setores where nome = 'Manutenção'), (select id from turnos where nome = '1º'), (select id from supervisores where nome = 'Alan'), 'clinico'::tipo_restricao, 'POS OPERATORIO', (select id from segmentos where nome = 'Pos Operatorio'), null::lateralidade, 'SOBRECARGA FISICA', null, (select id from profissionais where nome = 'Paola'), 'planilha', 131);

-- Liga a duplicata ao registro que ela repete.
update remanejamentos d
  set possivel_duplicata_de = o.id
  from remanejamentos o
  where d.linha_origem = 131
    and o.linha_origem = 135;

-- Registra a matrícula faltante como pendência a resolver.
insert into importacao_pendencias (linha, campo, motivo, valor_original, acao, colaborador) values
  (28, 'cod', 'Colaborador importado sem matrícula: buscar no RH e preencher', '(vazio)', 'revisar', 'Aline Ribeiro'),
  (45, 'cod', 'Colaborador importado sem matrícula: buscar no RH e preencher', '(vazio)', 'revisar', 'Joao Victor Viera da Silva'),
  (73, 'cod', 'Colaborador importado sem matrícula: buscar no RH e preencher', '(vazio)', 'revisar', 'Cristina Rosario da Silva');

-- BLOCO D — reativa a proteção contra duplicata acidental
--
-- Agora que a duplicata da planilha está marcada, o índice parcial
-- pode entrar: dois registros da mesma pessoa na mesma data só passam
-- se um deles estiver explicitamente sinalizado como duplicata.
create unique index if not exists remanejamentos_sem_duplicata_idx
  on remanejamentos (colaborador_id, data_inicio)
  where possivel_duplicata_de is null;

notify pgrst, 'reload schema';
