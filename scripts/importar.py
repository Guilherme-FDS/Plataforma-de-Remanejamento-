#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Importa a planilha REMANEJADOS MARINGA 2026.xlsx para JSON normalizado.

Saidas (em dados/):
  colaboradores.json   - pessoas deduplicadas por matricula
  remanejamentos.json  - eventos normalizados
  listas.json          - setores, turnos, supervisores, profissionais, segmentos
  pendencias.json      - registros que nao passaram na validacao, com motivo

Nada e corrigido em silencio: toda correcao automatica vira uma pendencia
com status "corrigido" para conferencia humana.

Uso:  python scripts/importar.py "caminho/para/planilha.xlsx"
"""
import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict
from datetime import date, datetime

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "dados")
ABA = "REMANEJADOS 2026"
PRIMEIRA_LINHA = 4

# Colunas da planilha (1-indexed)
COL = {
    "mes": 2, "data": 3, "cod": 4, "nome": 5, "setor": 6, "turno": 7,
    "tempo": 8, "causa": 9, "segmento": 10, "contraindicacao": 11,
    "supervisor": 12, "tipo": 13, "observacoes": 14, "profissional": 15,
    "encerramento": 16,
}


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def chave(s):
    """Normaliza para comparacao: maiuscula, sem acento, espacos colapsados."""
    return re.sub(r"\s+", " ", sem_acento((s or "").strip().upper())).strip()


def titulo(s):
    """Converte MAIUSCULA para Título, preservando preposicoes minusculas."""
    miudas = {"de", "da", "do", "das", "dos", "e"}
    palavras = (s or "").strip().lower().split()
    return " ".join(p if i > 0 and p in miudas else p.capitalize()
                    for i, p in enumerate(palavras))


# ---------------------------------------------------------------- SETORES
SETORES = {
    "EVISCERACAO": "Evisceração",
    "CONE": "Cone",
    "CONE/PRIME": "Cone/Prime",
    "DESOSSA": "Desossa",
    "REFILE": "Refile",
    "SIF": "SIF",
    "DIF": "DIF",
    "SIF/DIF": "SIF/DIF",
    "PALETIZACAO": "Paletização",
    "PALETIZCAO": "Paletização",
    "EMBALAGEM": "Embalagem",
    "EMBALAGEM PRIMARIA": "Embalagem Primária",
    "EMB. PRIMARIA": "Embalagem Primária",
    "EMBALAGEM SECUNDARIA": "Embalagem Secundária",
    "EMBALAGEM MIUDOS": "Embalagem Miúdos",
    "MONTAGEM DE CAIXAS": "Montagem de Caixas",
    "PLATAFORMA": "Plataforma",
    "ASA": "Asa",
    "TAMBLEADOS": "Tambleados",
    "CMS": "CMS",
    "FFO": "FFO",
    "FABRICA DE FARINHA": "Fábrica de Farinha",
    "GIROFRIZEER": "Girofreezer",
    "GIROFRIZZER": "Girofreezer",
    "EXPEDICAO": "Expedição",
    "MANUTENCAO": "Manutenção",
    "PATIO": "Pátio",
    "SERVICOS DE RH": "Serviços de RH",
}

# --------------------------------------------------------------- SUPERVISORES
# Grafias diferentes da MESMA pessoa. Nomes proximos mas plausivelmente
# distintos (Geovani x Giovani) sao mantidos separados e sinalizados.
SUPERVISORES = {
    "PAJE": "Pajé", "PAGE": "Pajé",
    "CASSIA/PAJE": "Cássia/Pajé", "CASSIA/PAGE": "Cássia/Pajé",
    "LAERCIO": "Laércio",
    "ANDERSON FELIPE": "Anderson Felipe", "ANDERSON FELIPPE": "Anderson Felipe",
    "AGNALDO": "Agnaldo", "AGUINALDO": "Agnaldo",
    "GIOVANNI": "Giovanni", "GIOVANI": "Giovanni", "GIOVANE": "Giovanni",
}
# Pares parecidos que NAO foram unificados (viram aviso no relatorio)
SUPERVISORES_AMBIGUOS = [("GEOVANI", "GIOVANNI"), ("VALDEIR", "VALDECI")]

# -------------------------------------------------------------- PROFISSIONAIS
PROFISSIONAIS = {"VINUCIUS": "Vinícius", "VINICIUS": "Vinícius"}

# ---------------------------------------------------------------- TIPOS
TIPOS = {
    "CLINICO": "clinico",
    "OCUPACIONAL": "ocupacional",
    "ACIDENTE": "acidente_trabalho",
    "ACIDENTE DE TRABALHO": "acidente_trabalho",
    "ACIDENTE DOMESTICO": "acidente_domestico",
}
TIPO_ROTULO = {
    "clinico": "Clínico",
    "ocupacional": "Ocupacional",
    "acidente_trabalho": "Acidente de Trabalho",
    "acidente_domestico": "Acidente Doméstico",
    "indefinido": "Indefinido",
}

# ------------------------------------------------------------- LATERALIDADE
# Ordem importa: padroes bilaterais antes dos unilaterais.
# ATENCAO: nao usar "\bE\b" solto como esquerdo -- em portugues "E" e
# conjuncao ("BRACOS E COSTAS" viraria "bracos, lado esquerdo").
LATERALIDADE = [
    (r"\(D,\s*E\)|\(D\)\s*\(\s*E\)|\bD,\s*E\b|BILATERAI?S?|AMBAS|AMBOS"
     r"|DIREITA?O?S?\s+E\s+ESQUERDA?O?S?", "bilateral"),
    (r"\bDIREITA?O?S?\b|\(D\)|\bMSD\b", "direito"),
    (r"\bESQUERDA?O?S?\b|\(E\)|\bMSE\b", "esquerdo"),
]

# ------------------------------------------------------------- SEGMENTOS
# Texto residual (ja sem lateralidade) -> (segmento canonico, regiao)
SEGMENTOS = {
    "OMBRO": ("Ombro", "Ombro"),
    "OMBROS": ("Ombro", "Ombro"),
    "PUNHO": ("Punho", "Punho e Mão"),
    "MAO": ("Mão", "Punho e Mão"),
    "MAOS": ("Mão", "Punho e Mão"),
    "DEDOS": ("Dedos", "Punho e Mão"),
    "DEDO MAO": ("Dedos", "Punho e Mão"),
    "DEDO DA MAO": ("Dedos", "Punho e Mão"),
    "DEDO POLEGAR": ("Dedos", "Punho e Mão"),
    "COTOVELO": ("Cotovelo", "Cotovelo e Antebraço"),
    "ANTEBRACO": ("Antebraço", "Cotovelo e Antebraço"),
    "BRACO": ("Braço", "Braço"),
    "BRACOS E COSTAS": ("Braço e Costas", "Braço"),
    "COLUNA": ("Coluna", "Coluna"),
    "COLUNA LOMBAR": ("Coluna Lombar", "Coluna"),
    "DOR LOMBAR E EM MMII": ("Coluna Lombar", "Coluna"),
    "COLUNA E ABDOMEN": ("Coluna e Abdômen", "Coluna"),
    "PESCOCO": ("Pescoço", "Coluna"),
    "QUADRIL": ("Quadril", "Quadril e Pelve"),
    "PELVICA": ("Pelve", "Quadril e Pelve"),
    "GLUTEOS": ("Glúteos", "Quadril e Pelve"),
    "HERNIA INGUINAL": ("Hérnia Inguinal", "Quadril e Pelve"),
    "JOELHO": ("Joelho", "Membros Inferiores"),
    "JOELHOS": ("Joelho", "Membros Inferiores"),
    "PERNA": ("Perna", "Membros Inferiores"),
    "PERNA E": ("Perna", "Membros Inferiores"),
    "PE": ("Pé", "Membros Inferiores"),
    "TORNOZELO": ("Tornozelo", "Membros Inferiores"),
    "MEMBRO INFERIOR": ("Membros Inferiores", "Membros Inferiores"),
    "MEMBROS INFERIORES": ("Membros Inferiores", "Membros Inferiores"),
    "PSICOLOGICO": ("Psicológico", "Saúde Mental"),
    "GESTANTE": ("Gestação", "Gestação"),
    "HISTERECTOMIA": ("Histerectomia", "Abdômen"),
    "ABDOMEN": ("Abdômen", "Abdômen"),
    "ABDOMINAL": ("Abdômen", "Abdômen"),
    "TORACICO": ("Tórax", "Tórax"),
    "SEIO": ("Mama", "Tórax"),
    "ASMA": ("Asma", "Respiratório"),
    "RESPIRATORIO": ("Respiratório", "Respiratório"),
    "OCULAR": ("Ocular", "Cabeça e Face"),
    "OLHOS": ("Ocular", "Cabeça e Face"),
    "ORELHA": ("Ouvido", "Cabeça e Face"),
    "OUVIDO": ("Ouvido", "Cabeça e Face"),
    "OUVIDO BILATERAL": ("Ouvido", "Cabeça e Face"),
    "ARTICULACOES": ("Articulações (múltiplas)", "Sistêmico"),
    "TENDINITE EM ARTICULACOES": ("Articulações (múltiplas)", "Sistêmico"),
    "CRISES CONVULSIVAS": ("Neurológico", "Sistêmico"),
    "CORPO": ("Sistêmico", "Sistêmico"),
    "CORPO TODO": ("Sistêmico", "Sistêmico"),
}

# ---------------------------------------------------------------- DURACAO
DURACAO_NAO_NUMERICA = {
    "PERMANENTE": ("permanente", None),
    "GESTANTE": ("gestacao", None),
    "FINAL DA GESTACAO": ("gestacao", None),
    "LICENCA MATERNIDADE": ("licenca", None),
}

MESES = {
    "JANEIRO": 1, "FEVEREIRO": 2, "MARCO": 3, "ABRIL": 4, "MAIO": 5, "JUNHO": 6,
    "JULHO": 7, "AGOSTO": 8, "SETEMBRO": 9, "OUTUBRO": 10, "NOVEMBRO": 11,
    "DEZEMBRO": 12,
}

pendencias = []


def pendencia(linha, campo, motivo, valor, acao, nome=""):
    pendencias.append({
        "linha": linha, "campo": campo, "motivo": motivo,
        "valorOriginal": str(valor), "acao": acao, "colaborador": nome,
    })


def parse_data(valor):
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    return None


def parse_duracao(texto, linha, nome):
    k = chave(texto)
    if not k:
        return ("indefinido", None)
    if k in DURACAO_NAO_NUMERICA:
        return DURACAO_NAO_NUMERICA[k]
    # aceita "30 DIAS", "07 DIAS", "10 DAIS" (erro de digitacao conhecido)
    m = re.match(r"^(\d+)\s*D[AI]{2}S?$", k)
    if m:
        if "DAIS" in k:
            pendencia(linha, "tempo", "Erro de digitação em 'DIAS'", texto,
                      "corrigido", nome)
        return ("dias", int(m.group(1)))
    pendencia(linha, "tempo", "Duração não reconhecida", texto, "revisar", nome)
    return ("indefinido", None)


def parse_segmento(texto, causa, linha, nome):
    """Extrai (segmento, regiao, lateralidade) de um texto livre."""
    bruto = chave(texto)
    if not bruto:
        # tenta inferir pela causa antes de desistir
        bruto = chave(causa)
        if not bruto:
            return (None, None, None)

    def separar(texto):
        lado = None
        residual = texto
        for padrao, valor in LATERALIDADE:
            if re.search(padrao, residual):
                lado = valor
                residual = re.sub(padrao, " ", residual)
                break
        residual = re.sub(r"[(),]", " ", residual)
        return re.sub(r"\s+", " ", residual).strip(), lado

    residual, lado = separar(bruto)

    # sobrou so a lateralidade ("BILATERAIS", "ESQUERDA"): o segmento em si
    # esta na causa
    if not residual and causa:
        residual, lado_causa = separar(chave(causa))
        lado = lado or lado_causa

    if residual in SEGMENTOS:
        seg, reg = SEGMENTOS[residual]
        return (seg, reg, lado)
    # tenta casar por prefixo/palavra-chave, do mais longo para o mais curto
    for termo in sorted(SEGMENTOS, key=len, reverse=True):
        if re.search(r"\b" + re.escape(termo) + r"\b", residual):
            seg, reg = SEGMENTOS[termo]
            return (seg, reg, lado)
    pendencia(linha, "segmento", "Segmento não mapeado", texto, "revisar", nome)
    return (titulo(residual) or None, "Não classificado", lado)


def main():
    caminho = sys.argv[1] if len(sys.argv) > 1 else None
    if not caminho or not os.path.exists(caminho):
        print("ERRO: informe o caminho da planilha .xlsx")
        return 1

    wb = openpyxl.load_workbook(caminho, data_only=True)
    ws = wb[ABA]

    colaboradores = OrderedDict()
    eventos = []
    setores, supervisores, profissionais, segmentos = {}, {}, {}, {}

    for linha in range(PRIMEIRA_LINHA, ws.max_row + 1):
        def v(nome_col):
            val = ws.cell(linha, COL[nome_col]).value
            if val is None:
                return ""
            if isinstance(val, (datetime, date)):
                return val
            return str(val).strip()

        nome = v("nome")
        cod = v("cod")
        data_bruta = v("data")

        tem_dados = any([nome, cod, v("setor"), v("causa"), data_bruta])

        # linha totalmente em branco: ignorada sem ruido
        if not tem_dados and not v("mes"):
            continue

        # linha fantasma: so o mes ficou preenchido
        if not tem_dados:
            pendencia(linha, "linha", "Linha sem dados (apenas o mês preenchido)",
                      v("mes"), "descartado")
            continue

        nome_limpo = titulo(re.sub(r"\s+", " ", nome))

        # ---- DATA
        data_inicio = parse_data(data_bruta)
        if data_inicio is None:
            if data_bruta:
                # tenta resgatar "17//04/2026" e variantes
                digitos = re.findall(r"\d+", str(data_bruta))
                if len(digitos) == 3:
                    try:
                        d, m, a = int(digitos[0]), int(digitos[1]), int(digitos[2])
                        data_inicio = date(a, m, d)
                        pendencia(linha, "data", "Data gravada como texto malformado",
                                  data_bruta, "corrigido", nome_limpo)
                    except ValueError:
                        pass
            if data_inicio is None:
                pendencia(linha, "data", "Sem data de início válida",
                          data_bruta or "(vazio)", "revisar", nome_limpo)

        # ---- ENCERRAMENTO
        enc_bruto = v("encerramento")
        data_encerramento = parse_data(enc_bruto)
        encerramento_texto = None
        if data_encerramento is None and enc_bruto:
            digitos = re.findall(r"\d+", str(enc_bruto))
            k = chave(enc_bruto)
            if k in DURACAO_NAO_NUMERICA:
                encerramento_texto = k
            elif len(digitos) >= 2:
                # "27/092026" -> dia 27, mes 09, ano 2026
                try:
                    if len(digitos) == 2 and len(digitos[1]) == 6:
                        d = int(digitos[0])
                        m = int(digitos[1][:2])
                        a = int(digitos[1][2:])
                        data_encerramento = date(a, m, d)
                        pendencia(linha, "encerramento",
                                  "Data gravada como texto malformado", enc_bruto,
                                  "corrigido", nome_limpo)
                except ValueError:
                    pendencia(linha, "encerramento", "Encerramento ilegível",
                              enc_bruto, "revisar", nome_limpo)
            else:
                encerramento_texto = k

        # ---- DURACAO
        duracao_tipo, duracao_dias = parse_duracao(v("tempo"), linha, nome_limpo)
        if duracao_tipo == "indefinido" and encerramento_texto in ("PERMANENTE",):
            duracao_tipo = "permanente"

        # ---- coerencia data x encerramento
        if data_inicio and data_encerramento:
            if data_encerramento < data_inicio:
                pendencia(linha, "encerramento",
                          "Encerramento anterior ao início (%s < %s)"
                          % (data_encerramento, data_inicio), enc_bruto,
                          "revisar", nome_limpo)
                data_encerramento = None
            elif duracao_tipo == "dias" and duracao_dias:
                delta = (data_encerramento - data_inicio).days
                if 360 <= delta - duracao_dias <= 370:
                    # ano do inicio digitado um ano a menos
                    corrigida = data_inicio.replace(year=data_inicio.year + 1)
                    pendencia(linha, "data",
                              "Ano do início inconsistente com a duração "
                              "(%s + %sd != %s). Ajustado para %s"
                              % (data_inicio, duracao_dias, data_encerramento,
                                 corrigida), data_inicio, "corrigido", nome_limpo)
                    data_inicio = corrigida

        # ---- SETOR
        setor_bruto = v("setor")
        setor = SETORES.get(chave(setor_bruto))
        if setor_bruto and not setor:
            setor = titulo(setor_bruto)
            pendencia(linha, "setor", "Setor não mapeado", setor_bruto,
                      "revisar", nome_limpo)
        if setor:
            setores[setor] = setores.get(setor, 0) + 1

        # ---- TURNO
        turno_bruto = chave(v("turno")).replace("°", "º").replace("A", "º")
        turno = None
        if turno_bruto.startswith("1"):
            turno = "1º"
        elif turno_bruto.startswith("2"):
            turno = "2º"
        elif turno_bruto.startswith("3"):
            turno = "3º"

        # ---- TIPO
        tipo_bruto = v("tipo")
        k_tipo = chave(tipo_bruto).rstrip("?").strip()
        tipo = TIPOS.get(k_tipo, "indefinido")
        if tipo == "indefinido" and tipo_bruto:
            pendencia(linha, "tipo", "Classificação ausente ou incerta",
                      tipo_bruto, "revisar", nome_limpo)

        # ---- SUPERVISOR / PROFISSIONAL
        sup_bruto = v("supervisor")
        supervisor = SUPERVISORES.get(chave(sup_bruto), titulo(sup_bruto)) or None
        if supervisor:
            supervisores[supervisor] = supervisores.get(supervisor, 0) + 1

        prof_bruto = v("profissional")
        profissional = PROFISSIONAIS.get(chave(prof_bruto), titulo(prof_bruto)) or None
        if profissional:
            profissionais[profissional] = profissionais.get(profissional, 0) + 1

        # ---- SEGMENTO
        segmento, regiao, lado = parse_segmento(v("segmento"), v("causa"),
                                                linha, nome_limpo)
        if segmento:
            segmentos[segmento] = regiao

        # ---- COLABORADOR
        matricula = None
        if cod:
            try:
                matricula = int(float(cod))
            except ValueError:
                pendencia(linha, "cod", "Matrícula inválida", cod, "revisar",
                          nome_limpo)
        if matricula is None:
            pendencia(linha, "cod", "Registro sem matrícula", "(vazio)",
                      "revisar", nome_limpo)

        if matricula is not None:
            if matricula not in colaboradores:
                colaboradores[matricula] = {
                    "matricula": matricula, "nome": nome_limpo,
                    "setor": setor, "turno": turno,
                }
            elif data_inicio:
                # mantem o setor/turno do registro mais recente
                colaboradores[matricula]["setor"] = setor or colaboradores[matricula]["setor"]
                colaboradores[matricula]["turno"] = turno or colaboradores[matricula]["turno"]

        eventos.append({
            "linhaOrigem": linha,
            "matricula": matricula,
            "nome": nome_limpo,
            "dataInicio": data_inicio.isoformat() if data_inicio else None,
            "setor": setor,
            "turno": turno,
            "duracaoTipo": duracao_tipo,
            "duracaoDias": duracao_dias,
            "causa": v("causa") or None,
            "segmento": segmento,
            "regiao": regiao,
            "lateralidade": lado,
            "contraindicacao": v("contraindicacao") or None,
            "supervisor": supervisor,
            "tipo": tipo,
            "observacoes": v("observacoes") or None,
            "profissional": profissional,
            "dataEncerramento": data_encerramento.isoformat() if data_encerramento else None,
            "encerramentoTexto": encerramento_texto,
        })

    # ---- duplicatas exatas (mesma matricula + mesma data de inicio)
    # Entre duas linhas iguais, a que fica e a MAIS COMPLETA: na planilha a
    # primeira ocorrencia costuma ser a tentativa abandonada (data malformada,
    # encerramento em branco) e a segunda e a boa.
    def preenchimento(ev):
        return sum(1 for v in ev.values() if v not in (None, "", "indefinido"))

    grupos = {}
    for ev in eventos:
        if ev["matricula"] and ev["dataInicio"]:
            grupos.setdefault((ev["matricula"], ev["dataInicio"]), []).append(ev)

    for grupo in grupos.values():
        if len(grupo) < 2:
            continue
        melhor = max(grupo, key=preenchimento)
        for ev in grupo:
            if ev is melhor:
                continue
            ev["duplicataDe"] = melhor["linhaOrigem"]
            pendencia(ev["linhaOrigem"], "linha",
                      "Possível duplicata da linha %s (mesma matrícula e "
                      "mesma data); mantido o registro mais completo"
                      % melhor["linhaOrigem"], ev["nome"], "revisar",
                      ev["nome"])

    os.makedirs(SAIDA, exist_ok=True)

    def escrever(nome_arq, conteudo):
        caminho_saida = os.path.join(SAIDA, nome_arq)
        with open(caminho_saida, "w", encoding="utf-8") as f:
            json.dump(conteudo, f, ensure_ascii=False, indent=2)
        print("  %-24s %s" % (nome_arq, len(conteudo) if isinstance(conteudo, list) else "ok"))

    listas = {
        "setores": sorted(setores),
        "turnos": ["1º", "2º", "3º"],
        "supervisores": sorted(supervisores),
        "profissionais": sorted(profissionais),
        "segmentos": [{"nome": s, "regiao": r} for s, r in
                      sorted(segmentos.items(), key=lambda x: (x[1], x[0]))],
        "tipos": [{"id": k, "rotulo": v} for k, v in TIPO_ROTULO.items()],
    }

    print("\nGerado em dados/:")
    escrever("colaboradores.json", list(colaboradores.values()))
    escrever("remanejamentos.json", eventos)
    escrever("listas.json", listas)
    escrever("pendencias.json", pendencias)

    print("\nResumo:")
    print("  eventos:        %d" % len(eventos))
    print("  colaboradores:  %d" % len(colaboradores))
    print("  pendencias:     %d (%d corrigidas, %d a revisar, %d descartadas)" % (
        len(pendencias),
        sum(1 for p in pendencias if p["acao"] == "corrigido"),
        sum(1 for p in pendencias if p["acao"] == "revisar"),
        sum(1 for p in pendencias if p["acao"] == "descartado"),
    ))
    print("  setores:        %d" % len(setores))
    print("  supervisores:   %d" % len(supervisores))
    print("  segmentos:      %d" % len(segmentos))

    achou = [(a, b) for a, b in SUPERVISORES_AMBIGUOS
             if any(chave(s) == a for s in supervisores)
             and any(chave(s) == b for s in supervisores)]
    if achou:
        print("\n  ATENCAO - nomes parecidos NAO unificados (confirme se sao a mesma pessoa):")
        for a, b in achou:
            print("    %s  x  %s" % (a, b))
    return 0


if __name__ == "__main__":
    sys.exit(main())
