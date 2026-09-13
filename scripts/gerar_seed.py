#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Gera supabase/migrations/0002_dados.sql a partir dos JSON normalizados.

Só entram registros que satisfazem as constraints do schema. O que não
entra é listado em comentário no topo do arquivo — e continua visível na
tela de Pendências do app.

Uso:  python scripts/gerar_seed.py
"""
import json
import os
from collections import Counter
from datetime import date

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DADOS = os.path.join(RAIZ, "dados")
SAIDA = os.path.join(RAIZ, "supabase", "migrations", "0002_dados.sql")

# Data em que a planilha foi importada. Um registro cuja previsão de término
# já havia passado nesta data era tratado como resolvido pela planilha (a
# coluna ENCERRAMENTO era preenchida no lançamento e nunca revisitada), então
# entra com data_encerramento preenchida e origem 'planilha'. Se a previsão
# ainda estava no futuro, o caso continua aberto.
DATA_IMPORTACAO = date.today()


def ler(nome):
    with open(os.path.join(DADOS, nome), encoding="utf-8") as f:
        return json.load(f)


def txt(valor):
    """Literal SQL de texto, com escape de aspas simples."""
    if valor is None or valor == "":
        return "null"
    return "'" + str(valor).replace("'", "''") + "'"


def num(valor):
    return "null" if valor is None else str(valor)


def busca(tabela, nome):
    """Subconsulta escalar para resolver a chave estrangeira pelo nome."""
    if not nome:
        return "null"
    return f"(select id from {tabela} where nome = {txt(nome)})"


def gerar_pendencias():
    """Gera 0003_pendencias.sql: tabela + carga do que a importação não
    resolveu sozinha. Fica no banco, e não num JSON, porque é trabalho a
    fazer — alguém precisa marcar como resolvido."""
    pendencias = ler("pendencias.json")
    destino = os.path.join(RAIZ, "supabase", "migrations",
                           "0003_pendencias.sql")

    linhas = [
        "-- " + "=" * 74,
        "-- Pendências da importação da planilha",
        "-- GERADO por scripts/gerar_seed.py. Não edite à mão.",
        "--",
        "-- Rode DEPOIS de 0002_dados.sql.",
        "-- " + "=" * 74,
        "",
        "create table if not exists importacao_pendencias (",
        "  id              serial primary key,",
        "  linha           integer not null,   -- linha na planilha original",
        "  campo           text not null,",
        "  motivo          text not null,",
        "  valor_original  text,",
        "  acao            text not null "
        "check (acao in ('corrigido', 'revisar', 'descartado')),",
        "  colaborador     text,",
        "  resolvida       boolean not null default false,",
        "  resolvida_por   uuid references perfis(id),",
        "  resolvida_em    timestamptz",
        ");",
        "",
        "comment on table importacao_pendencias is",
        "  'O que a importação não teve base para decidir sozinha. Existe para "
        "que nada fosse corrigido em silêncio: decisão sobre dado clínico é da "
        "equipe, não do script.';",
        "",
        "alter table importacao_pendencias enable row level security;",
        "",
        "drop policy if exists equipe_total on importacao_pendencias;",
        "create policy equipe_total on importacao_pendencias",
        "  for all using (e_equipe()) with check (e_equipe());",
        "",
        "delete from importacao_pendencias;",
        "",
        "insert into importacao_pendencias "
        "(linha, campo, motivo, valor_original, acao, colaborador) values",
    ]

    valores = [
        "  (%d, %s, %s, %s, %s, %s)" % (
            p["linha"], txt(p["campo"]), txt(p["motivo"]),
            txt(p["valorOriginal"]), txt(p["acao"]), txt(p["colaborador"]),
        )
        for p in pendencias
    ]
    linhas.append(",\n".join(valores) + ";")
    linhas.append("")
    linhas.append("notify pgrst, 'reload schema';")

    with open(destino, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    print("Gerado: supabase/migrations/0003_pendencias.sql")
    print(f"  pendencias:     {len(pendencias)}")


def main():
    colaboradores = ler("colaboradores.json")
    eventos = ler("remanejamentos.json")
    listas = ler("listas.json")

    linhas = []
    w = linhas.append

    w("-- " + "=" * 74)
    w("-- Plataforma de Remanejamento — carga inicial")
    w("-- GERADO por scripts/gerar_seed.py. Não edite à mão: rode o script.")
    w("--")
    w("-- Rode DEPOIS de 0001_schema.sql, um bloco por vez.")
    w("-- " + "=" * 74)
    w("")

    # ---------------------------------------------------------- BLOCO A
    w("-- BLOCO A — listas de domínio")
    w("")
    regioes = sorted({s["regiao"] for s in listas["segmentos"]})
    w("insert into regioes_corporais (nome) values")
    w(",\n".join(f"  ({txt(r)})" for r in regioes) + "\non conflict (nome) do nothing;")
    w("")

    w("insert into segmentos (nome, regiao_id) values")
    w(",\n".join(
        f"  ({txt(s['nome'])}, {busca('regioes_corporais', s['regiao'])})"
        for s in listas["segmentos"]
    ) + "\non conflict (nome) do nothing;")
    w("")

    for tabela, valores in [
        ("setores", listas["setores"]),
        ("turnos", listas["turnos"]),
        ("supervisores", listas["supervisores"]),
        ("profissionais", listas["profissionais"]),
    ]:
        w(f"insert into {tabela} (nome) values")
        w(",\n".join(f"  ({txt(v)})" for v in valores)
          + "\non conflict (nome) do nothing;")
        w("")

    # ------------------------------------------------- contraindicações
    modelos = {}
    for e in eventos:
        if not e["segmento"] or not e["contraindicacao"]:
            continue
        t = " ".join(e["contraindicacao"].split())
        if not 12 <= len(t) <= 160:
            continue
        chave = (e["segmento"], t.upper())
        modelos[chave] = modelos.get(chave, 0) + 1

    if modelos:
        w("-- Frases já usadas na planilha, viram sugestão no formulário.")
        w("insert into contraindicacoes_modelo (segmento_id, texto, usos) values")
        w(",\n".join(
            f"  ({busca('segmentos', seg)}, {txt(texto)}, {usos})"
            for (seg, texto), usos in sorted(modelos.items())
        ) + "\non conflict (segmento_id, texto) do nothing;")
        w("")

    # ---------------------------------------------------------- BLOCO B
    w("-- BLOCO B — colaboradores")
    w("")
    w("insert into colaboradores (matricula, nome, setor_id, turno_id) values")
    w(",\n".join(
        f"  ({c['matricula']}, {txt(c['nome'])}, "
        f"{busca('setores', c['setor'])}, {busca('turnos', c['turno'])})"
        for c in colaboradores
    ) + "\non conflict (matricula) do nothing;")
    w("")

    # ---------------------------------------------------------- BLOCO C
    ignorados = []
    vistos = set()
    validos = []

    for e in eventos:
        motivos = []
        if e["matricula"] is None:
            motivos.append("sem matrícula")
        if not e["dataInicio"]:
            motivos.append("sem data de início")
        if not e["setor"]:
            motivos.append("sem setor")
        if not e["turno"]:
            motivos.append("sem turno")
        if e.get("duplicataDe"):
            motivos.append(f"duplicata da linha {e['duplicataDe']}")

        chave = (e["matricula"], e["dataInicio"])
        if not motivos and chave in vistos:
            motivos.append("mesma matrícula e data de outro registro")
        if motivos:
            ignorados.append((e["linhaOrigem"], e["nome"], motivos))
            continue

        vistos.add(chave)
        validos.append(e)

    w("-- BLOCO C — remanejamentos")
    w(f"-- {len(validos)} de {len(eventos)} registros da planilha.")
    if ignorados:
        w(f"-- {len(ignorados)} ficaram de fora por violarem uma constraint;")
        w("-- todos continuam listados na tela de Pendências do app:")
        for linha, nome, motivos in ignorados:
            w(f"--   L{linha:<4} {nome[:32]:34s} {'; '.join(motivos)}")
    w("")

    colunas = (
        "colaborador_id, data_inicio, duracao_tipo, duracao_dias, "
        "data_encerramento, "
        "setor_id, turno_id, supervisor_id, tipo, causa, segmento_id, "
        "lado, contraindicacao, observacoes, profissional_id, "
        "origem, linha_origem"
    )
    w("-- data_encerramento vem da coluna ENCERRAMENTO da planilha quando ela")
    w(f"-- já havia passado em {DATA_IMPORTACAO.isoformat()} (a planilha a")
    w("-- tratava como desfecho). Previsão futura entra como caso ainda aberto.")
    w(f"insert into remanejamentos ({colunas}) values")

    encerrados = 0
    valores = []
    for e in validos:
        dur = e["duracaoTipo"]
        dias = e["duracaoDias"] if dur == "dias" else None

        encerramento = None
        if e["dataEncerramento"] and dur not in ("permanente", "gestacao",
                                                 "licenca"):
            if date.fromisoformat(e["dataEncerramento"]) <= DATA_IMPORTACAO:
                encerramento = e["dataEncerramento"]
                encerrados += 1

        valores.append(
            "  ("
            f"(select id from colaboradores where matricula = {e['matricula']}), "
            f"date {txt(e['dataInicio'])}, "
            f"{txt(dur)}::duracao_tipo, {num(dias)}, "
            + (f"date {txt(encerramento)}, " if encerramento else "null, ")
            + f"{busca('setores', e['setor'])}, "
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
    w(",\n".join(valores) + ";")
    w("")
    w("notify pgrst, 'reload schema';")

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")

    gerar_pendencias()

    print("Gerado: supabase/migrations/0002_dados.sql")
    print(f"  colaboradores:  {len(colaboradores)}")
    print(f"  remanejamentos: {len(validos)} (de {len(eventos)})")
    print(f"  ignorados:      {len(ignorados)}")
    print(f"  ja encerrados:  {encerrados}")
    for _, _, motivos in ignorados:
        pass
    contagem = Counter(m for _, _, ms in ignorados for m in ms)
    for motivo, n in contagem.most_common():
        print(f"    {n}x {motivo}")


if __name__ == "__main__":
    main()
