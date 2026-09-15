#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Gera supabase/migrations/0004_fidelidade.sql.

O banco recebeu 128 dos 132 registros da planilha: 3 foram barrados por não
terem matrícula e 1 por ser duplicata. Para o histórico ser 100% fiel à
planilha, o schema precisa aceitar os dois casos:

  - matrícula ausente é um dado que FALTA, não um motivo para apagar a
    pessoa. Vira coluna anulável, com a pendência registrada.
  - duplicata é um fato da planilha. Passa a ser sinalizada
    (possivel_duplicata_de) em vez de bloqueada por índice único.

Uso:  python scripts/gerar_0004.py
"""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "supabase", "migrations", "0004_fidelidade.sql")


def txt(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def busca(tabela, nome):
    return "null" if not nome else \
        f"(select id from {tabela} where nome = {txt(nome)})"


def main():
    with open(os.path.join(RAIZ, "dados", "remanejamentos.json"),
              encoding="utf-8") as f:
        eventos = json.load(f)

    faltantes = [e for e in eventos
                 if e["matricula"] is None or e.get("duplicataDe")]
    sem_matricula = [e for e in faltantes if e["matricula"] is None]

    L = []
    w = L.append
    w("-- " + "=" * 74)
    w("-- Fidelidade à planilha: entram os 4 registros que o schema barrava")
    w("-- GERADO por scripts/gerar_0004.py. Não edite à mão.")
    w("--")
    w("-- Rode DEPOIS de 0003_pendencias.sql.")
    w("-- " + "=" * 74)
    w("")
    w("-- BLOCO A — schema aceita o que a planilha realmente tem")
    w("")
    w("-- Matrícula ausente é dado que falta, não motivo para a pessoa sumir.")
    w("alter table colaboradores alter column matricula drop not null;")
    w("")
    w("-- Duplicata é um fato da planilha: passa a ser sinalizada, não")
    w("-- bloqueada. O índice único impedia o registro de existir.")
    w("drop index if exists remanejamentos_sem_duplicata_idx;")
    w("")
    w("alter table remanejamentos")
    w("  add column if not exists possivel_duplicata_de bigint")
    w("  references remanejamentos(id);")
    w("")
    w("-- O índice novo só entra no BLOCO D, depois de a duplicata ser inserida")
    w("-- e marcada. Criado aqui, ele barraria a própria inserção.")
    w("")
    w("-- BLOCO B — as 3 pessoas sem matrícula")
    w("")
    w("insert into colaboradores (matricula, nome, setor_id, turno_id) values")
    w(",\n".join(
        f"  (null, {txt(e['nome'])}, {busca('setores', e['setor'])}, "
        f"{busca('turnos', e['turno'])})"
        for e in sem_matricula
    ) + ";")
    w("")
    w("-- BLOCO C — os 4 remanejamentos")
    w("")

    colunas = ("colaborador_id, data_inicio, duracao_tipo, duracao_dias, "
               "data_encerramento, setor_id, turno_id, supervisor_id, tipo, "
               "causa, segmento_id, lado, contraindicacao, observacoes, "
               "profissional_id, origem, linha_origem")
    w(f"insert into remanejamentos ({colunas}) values")

    linhas = []
    for e in faltantes:
        if e["matricula"] is None:
            quem = (f"(select id from colaboradores where matricula is null "
                    f"and nome = {txt(e['nome'])})")
        else:
            quem = (f"(select id from colaboradores where matricula = "
                    f"{e['matricula']})")
        dur = e["duracaoTipo"]
        dias = e["duracaoDias"] if dur == "dias" else None
        enc = e["dataEncerramento"] if (
            e["dataEncerramento"] and dur not in ("permanente", "gestacao",
                                                  "licenca")) else None
        linhas.append(
            f"  ({quem}, date {txt(e['dataInicio'])}, "
            f"{txt(dur)}::duracao_tipo, "
            f"{'null' if dias is None else dias}, "
            f"{('date ' + txt(enc)) if enc else 'null'}, "
            f"{busca('setores', e['setor'])}, "
            f"{busca('turnos', e['turno'])}, "
            f"{busca('supervisores', e['supervisor'])}, "
            f"{txt(e['tipo'])}::tipo_restricao, "
            f"{txt(e['causa'])}, "
            f"{busca('segmentos', e['segmento'])}, "
            f"{txt(e['lateralidade'])}::lateralidade, "
            f"{txt(e['contraindicacao'])}, "
            f"{txt(e['observacoes'])}, "
            f"{busca('profissionais', e['profissional'])}, "
            f"'planilha', {e['linhaOrigem']})"
        )
    w(",\n".join(linhas) + ";")
    w("")
    w("-- Liga a duplicata ao registro que ela repete.")
    for e in faltantes:
        if e.get("duplicataDe"):
            w("update remanejamentos d")
            w("  set possivel_duplicata_de = o.id")
            w("  from remanejamentos o")
            w(f"  where d.linha_origem = {e['linhaOrigem']}")
            w(f"    and o.linha_origem = {e['duplicataDe']};")
            w("")
    w("-- Registra a matrícula faltante como pendência a resolver.")
    w("insert into importacao_pendencias "
      "(linha, campo, motivo, valor_original, acao, colaborador) values")
    w(",\n".join(
        f"  ({e['linhaOrigem']}, 'cod', "
        f"'Colaborador importado sem matrícula: buscar no RH e preencher', "
        f"'(vazio)', 'revisar', {txt(e['nome'])})"
        for e in sem_matricula
    ) + ";")
    w("")
    w("-- BLOCO D — reativa a proteção contra duplicata acidental")
    w("--")
    w("-- Agora que a duplicata da planilha está marcada, o índice parcial")
    w("-- pode entrar: dois registros da mesma pessoa na mesma data só passam")
    w("-- se um deles estiver explicitamente sinalizado como duplicata.")
    w("create unique index if not exists remanejamentos_sem_duplicata_idx")
    w("  on remanejamentos (colaborador_id, data_inicio)")
    w("  where possivel_duplicata_de is null;")
    w("")
    w("notify pgrst, 'reload schema';")

    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")

    print("Gerado: supabase/migrations/0004_fidelidade.sql")
    print(f"  colaboradores sem matricula: {len(sem_matricula)}")
    print(f"  remanejamentos adicionados:  {len(faltantes)}")
    print(f"  total apos rodar:            {len(eventos)} de {len(eventos)}")


if __name__ == "__main__":
    main()
