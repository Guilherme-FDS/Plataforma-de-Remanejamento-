/**
 * Testes de `situacaoDe()` — a regra existe em dois lugares que precisam
 * concordar (aqui em TypeScript e `situacao_remanejamento()` no Postgres,
 * ver supabase/migrations/0001_schema.sql, Bloco 5). O Postgres não roda
 * neste ambiente, então a paridade não é automática — mas cada caso abaixo
 * tem o equivalente comentado em SQL ao lado, pra quem mexer numa lembrar
 * de conferir a outra.
 *
 * PARIDADE — sempre que um teste aqui mudar de expectativa, o `case` da
 * função no Postgres precisa mudar do mesmo jeito, e vice-versa.
 */
import { describe, expect, it } from "vitest";
import {
  estaAberto,
  estatisticaDuracao,
  RELATORIO_PADRAO,
  filtrarRelatorio,
  incidenciaPorSetor,
  montarRelatorio,
  ordenarRelatorio,
  relatorioDeParams,
  relatorioParaParams,
  situacaoDe,
} from "./calculos";
import type { Remanejamento } from "./tipos";

const BASE: Remanejamento = {
  id: 1,
  colaboradorId: 1,
  matricula: 123,
  nome: "Fulano de Tal",
  dataInicio: "2026-01-01",
  duracaoTipo: "dias",
  duracaoDias: 30,
  dataPrevistaFim: "2026-01-31",
  dataEncerramento: null,
  setor: "Evisceração",
  turno: "1º turno",
  supervisor: null,
  tipo: "clinico",
  causa: null,
  segmento: null,
  regiao: null,
  lateralidade: null,
  contraindicacao: null,
  observacoes: null,
  profissional: null,
  origem: "sistema",
  linhaOrigem: null,
  possivelDuplicataDe: null,
  excluido: false,
  excluidoEm: null,
};

const REF = new Date(2026, 5, 15); // 15/06/2026 — data de referência fixa nos testes

describe("situacaoDe()", () => {
  it("encerrado quando há data_encerramento, seja qual for o resto", () => {
    // SQL: when p_data_encerramento is not null then 'encerrado'
    expect(
      situacaoDe({ ...BASE, dataEncerramento: "2026-01-20", dataPrevistaFim: "2026-12-31" }, REF),
    ).toBe("encerrado");
  });

  it("permanente quando duracaoTipo = permanente, mesmo sem previsão de fim", () => {
    // SQL: when p_duracao_tipo = 'permanente' then 'permanente'
    expect(
      situacaoDe({ ...BASE, duracaoTipo: "permanente", dataPrevistaFim: null }, REF),
    ).toBe("permanente");
  });

  it.each(["gestacao", "licenca"] as const)(
    "acompanhamento quando duracaoTipo = %s",
    (tipo) => {
      // SQL: when p_duracao_tipo in ('gestacao', 'licenca') then 'acompanhamento'
      expect(situacaoDe({ ...BASE, duracaoTipo: tipo, dataPrevistaFim: null }, REF)).toBe(
        "acompanhamento",
      );
    },
  );

  it("sem_previsao quando falta data_prevista_fim e não é permanente/acompanhamento", () => {
    // SQL: when p_data_prevista_fim is null then 'sem_previsao'
    expect(situacaoDe({ ...BASE, duracaoTipo: "indefinido", dataPrevistaFim: null }, REF)).toBe(
      "sem_previsao",
    );
  });

  it("em_andamento quando a previsão de fim ainda não chegou", () => {
    // SQL: when p_data_prevista_fim >= current_date then 'em_andamento'
    expect(situacaoDe({ ...BASE, dataPrevistaFim: "2026-06-15" }, REF)).toBe("em_andamento");
  });

  it("em_andamento no dia exato da previsão (fronteira >=)", () => {
    expect(situacaoDe({ ...BASE, dataPrevistaFim: "2026-06-16" }, REF)).toBe("em_andamento");
  });

  it("a_encerrar quando a previsão já passou e ninguém confirmou o desfecho", () => {
    // SQL: else 'a_encerrar'
    expect(situacaoDe({ ...BASE, dataPrevistaFim: "2026-06-14" }, REF)).toBe("a_encerrar");
  });

  it("encerrado tem prioridade sobre permanente", () => {
    // A ordem dos `when` importa: SQL confere encerramento antes de tudo.
    expect(
      situacaoDe({ ...BASE, duracaoTipo: "permanente", dataEncerramento: "2026-01-10" }, REF),
    ).toBe("encerrado");
  });
});

describe("estaAberto()", () => {
  it("encerrado não conta como aberto", () => {
    expect(estaAberto({ ...BASE, dataEncerramento: "2026-01-10" }, REF)).toBe(false);
  });

  it("a_encerrar ainda conta como aberto — é o que os indicadores precisam pegar", () => {
    expect(estaAberto({ ...BASE, dataPrevistaFim: "2026-06-14" }, REF)).toBe(true);
  });
});

describe("estatisticaDuracao()", () => {
  function comDias(...dias: number[]) {
    return dias.map((d, i) => ({ ...BASE, id: i, duracaoTipo: "dias" as const, duracaoDias: d }));
  }

  it("mediana com quantidade ímpar de casos — o do meio", () => {
    expect(estatisticaDuracao(comDias(10, 20, 30)).mediana).toBe(20);
  });

  it("mediana com quantidade par — média dos dois do meio, não só o de cima", () => {
    // Bug real: a versão antiga devolvia 30 aqui (só o de cima).
    expect(estatisticaDuracao(comDias(10, 20, 30, 40)).mediana).toBe(25);
  });

  it("ignora permanentes no cálculo de duração", () => {
    const itens = [
      ...comDias(10, 20),
      { ...BASE, id: 99, duracaoTipo: "permanente" as const, duracaoDias: null },
    ];
    expect(estatisticaDuracao(itens).n).toBe(2);
  });
});

describe("incidenciaPorSetor()", () => {
  it("calcula taxa por 100 quando o efetivo está cadastrado", () => {
    const itens = [
      { ...BASE, id: 1, setor: "Evisceração" },
      { ...BASE, id: 2, setor: "Evisceração" },
      { ...BASE, id: 3, setor: "Cone" },
    ];
    const resultado = incidenciaPorSetor(itens, { Evisceração: 200, Cone: 50 });

    const evisceracao = resultado.find((r) => r.setor === "Evisceração");
    const cone = resultado.find((r) => r.setor === "Cone");

    expect(evisceracao).toMatchObject({ casos: 2, efetivo: 200, taxa: 1 });
    expect(cone).toMatchObject({ casos: 1, efetivo: 50, taxa: 2 });
  });

  it("não inventa taxa para setor sem efetivo cadastrado", () => {
    const itens = [{ ...BASE, setor: "Plataforma" }];
    const resultado = incidenciaPorSetor(itens, { Plataforma: null });
    expect(resultado[0]).toMatchObject({ casos: 1, efetivo: null, taxa: null });
  });

  it("ordena setores com taxa antes dos sem taxa, por taxa decrescente", () => {
    const itens = [
      { ...BASE, id: 1, setor: "A" },
      { ...BASE, id: 2, setor: "B" },
      { ...BASE, id: 3, setor: "B" },
      { ...BASE, id: 4, setor: "C" },
    ];
    const resultado = incidenciaPorSetor(itens, { A: 1000, B: 100, C: null });
    expect(resultado.map((r) => r.setor)).toEqual(["B", "A", "C"]);
  });
});

describe("ordenarRelatorio()", () => {
  const itens: Remanejamento[] = [
    { ...BASE, id: 1, nome: "Bruno", matricula: 30, dataInicio: "2026-03-01", dataPrevistaFim: "2026-04-01" },
    { ...BASE, id: 2, nome: "ana", matricula: null, dataInicio: "2026-01-01", dataPrevistaFim: null, duracaoTipo: "permanente", duracaoDias: null },
    { ...BASE, id: 3, nome: "Carla", matricula: 10, dataInicio: "2026-02-01", dataPrevistaFim: "2026-12-01" },
  ];
  const ids = (l: Remanejamento[]) => l.map((r) => r.id);

  it("nome ignora maiúsculas", () => {
    expect(ids(ordenarRelatorio(itens, "nome", "asc"))).toEqual([2, 1, 3]);
    expect(ids(ordenarRelatorio(itens, "nome", "desc"))).toEqual([3, 1, 2]);
  });

  it("data de início", () => {
    expect(ids(ordenarRelatorio(itens, "inicio", "asc"))).toEqual([2, 3, 1]);
    expect(ids(ordenarRelatorio(itens, "inicio", "desc"))).toEqual([1, 3, 2]);
  });

  it("código e previsão deixam vazios no fim nas duas direções", () => {
    expect(ids(ordenarRelatorio(itens, "codigo", "asc"))).toEqual([3, 1, 2]);
    expect(ids(ordenarRelatorio(itens, "codigo", "desc"))).toEqual([1, 3, 2]);
    expect(ids(ordenarRelatorio(itens, "previsao", "asc"))).toEqual([1, 3, 2]);
    expect(ids(ordenarRelatorio(itens, "previsao", "desc"))).toEqual([3, 1, 2]);
  });
});

describe("parâmetros do relatório (tela → PDF)", () => {
  it("ida e volta pela query string preserva tudo", () => {
    const p = {
      ...RELATORIO_PADRAO,
      setores: ["Evisceração", "Plataforma"],
      situacao: "abertos" as const,
      turno: "2º",
      supervisor: "Jeferson",
      de: "2026-01-01",
      ate: "2026-10-29",
      busca: "silva",
      ordem: "previsao" as const,
      direcao: "desc" as const,
      modelo: "resumido" as const,
    };
    const q = Object.fromEntries(relatorioParaParams(p));
    expect(relatorioDeParams(q)).toEqual(p);
  });

  it("ordem e direção sempre vão na URL, mesmo no padrão", () => {
    const q = relatorioParaParams(RELATORIO_PADRAO);
    expect(q.get("ordem")).toBe("inicio");
    expect(q.get("direcao")).toBe("desc");
  });

  it("valor inválido cai no padrão", () => {
    expect(relatorioDeParams({ ordem: "x", direcao: "y", de: "29/10/2026" })).toEqual(
      RELATORIO_PADRAO,
    );
  });

  it("previsão decrescente põe sem previsão no fim (caso do PDF reportado)", () => {
    const itens: Remanejamento[] = [
      { ...BASE, id: 1, dataInicio: "2026-10-20", dataPrevistaFim: null, duracaoTipo: "permanente", duracaoDias: null },
      { ...BASE, id: 2, dataInicio: "2026-10-01", dataPrevistaFim: "2026-11-05" },
      { ...BASE, id: 3, dataInicio: "2026-09-01", dataPrevistaFim: "2027-01-20" },
    ];
    const r = montarRelatorio(itens, { ...RELATORIO_PADRAO, ordem: "previsao", direcao: "desc" }, REF);
    expect(r.map((x) => x.id)).toEqual([3, 2, 1]);
  });
});

describe("filtrarRelatorio() — filtros novos", () => {
  const itens: Remanejamento[] = [
    { ...BASE, id: 1, nome: "João da Silva", matricula: 111, turno: "1º", supervisor: "Ana", dataInicio: "2026-03-01" },
    { ...BASE, id: 2, nome: "Maria Souza", matricula: 222, turno: "2º", supervisor: "Beto", dataInicio: "2026-05-10" },
  ];
  const ids = (l: Remanejamento[]) => l.map((r) => r.id);

  it("turno e supervisor", () => {
    expect(ids(filtrarRelatorio(itens, { turno: "2º" }, REF))).toEqual([2]);
    expect(ids(filtrarRelatorio(itens, { supervisor: "Ana" }, REF))).toEqual([1]);
  });

  it("período de início inclusivo", () => {
    expect(ids(filtrarRelatorio(itens, { de: "2026-05-10" }, REF))).toEqual([2]);
    expect(ids(filtrarRelatorio(itens, { ate: "2026-03-01" }, REF))).toEqual([1]);
  });

  it("busca por nome sem acento e por código", () => {
    expect(ids(filtrarRelatorio(itens, { busca: "JOAO" }, REF))).toEqual([1]);
    expect(ids(filtrarRelatorio(itens, { busca: "222" }, REF))).toEqual([2]);
  });
});
