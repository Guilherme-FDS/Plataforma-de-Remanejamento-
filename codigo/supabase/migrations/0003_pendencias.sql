-- ==========================================================================
-- Pendências da importação da planilha
-- GERADO por scripts/gerar_seed.py. Não edite à mão.
--
-- Rode DEPOIS de 0002_dados.sql.
-- ==========================================================================

create table if not exists importacao_pendencias (
  id              serial primary key,
  linha           integer not null,   -- linha na planilha original
  campo           text not null,
  motivo          text not null,
  valor_original  text,
  acao            text not null check (acao in ('corrigido', 'revisar', 'descartado')),
  colaborador     text,
  resolvida       boolean not null default false,
  resolvida_por   uuid references perfis(id),
  resolvida_em    timestamptz
);

comment on table importacao_pendencias is
  'O que a importação não teve base para decidir sozinha. Existe para que nada fosse corrigido em silêncio: decisão sobre dado clínico é da equipe, não do script.';

alter table importacao_pendencias enable row level security;

drop policy if exists equipe_total on importacao_pendencias;
create policy equipe_total on importacao_pendencias
  for all using (e_equipe()) with check (e_equipe());

delete from importacao_pendencias;

insert into importacao_pendencias (linha, campo, motivo, valor_original, acao, colaborador) values
  (6, 'data', 'Ano do início inconsistente com a duração (2025-01-05 + 60d != 2026-03-05). Ajustado para 2026-01-05', '2025-01-05', 'corrigido', 'Marlene Aparecida Furlani'),
  (9, 'data', 'Ano do início inconsistente com a duração (2025-01-06 + 7d != 2026-01-12). Ajustado para 2026-01-06', '2025-01-06', 'corrigido', 'Claudia Churria'),
  (28, 'cod', 'Registro sem matrícula', '(vazio)', 'revisar', 'Aline Ribeiro'),
  (40, 'tempo', 'Erro de digitação em ''DIAS''', '10 DAIS', 'corrigido', 'Alessandra Aparecida'),
  (45, 'cod', 'Registro sem matrícula', '(vazio)', 'revisar', 'Joao Victor Viera da Silva'),
  (59, 'tipo', 'Classificação ausente ou incerta', '?', 'revisar', 'Jephte Omelus'),
  (73, 'segmento', 'Segmento não mapeado', null, 'revisar', 'Cristina Rosario da Silva'),
  (73, 'cod', 'Registro sem matrícula', '(vazio)', 'revisar', 'Cristina Rosario da Silva'),
  (85, 'encerramento', 'Encerramento anterior ao início (2025-01-23 < 2025-09-22)', '2025-01-23 00:00:00', 'revisar', 'Pedro Ronald de Freitas Pessoa'),
  (131, 'data', 'Data gravada como texto malformado', '17//04/2026', 'corrigido', 'Paulo Roberto de Andrade'),
  (131, 'segmento', 'Segmento não mapeado', null, 'revisar', 'Paulo Roberto de Andrade'),
  (132, 'linha', 'Linha sem dados (apenas o mês preenchido)', 'ABRIL', 'descartado', null),
  (133, 'linha', 'Linha sem dados (apenas o mês preenchido)', 'ABRIL', 'descartado', null),
  (134, 'linha', 'Linha sem dados (apenas o mês preenchido)', 'ABRIL', 'descartado', null),
  (135, 'segmento', 'Segmento não mapeado', null, 'revisar', 'Paulo Roberto de Andrade'),
  (159, 'segmento', 'Segmento não mapeado', 'ESQUERDA', 'revisar', 'João Landim Maciel'),
  (163, 'encerramento', 'Data gravada como texto malformado', '27/092026', 'corrigido', 'Alex Oliveira Neto'),
  (131, 'linha', 'Possível duplicata da linha 135 (mesma matrícula e mesma data); mantido o registro mais completo', 'Paulo Roberto de Andrade', 'revisar', 'Paulo Roberto de Andrade');

notify pgrst, 'reload schema';
