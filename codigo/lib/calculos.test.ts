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
  incidenciaPorSetor,
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
