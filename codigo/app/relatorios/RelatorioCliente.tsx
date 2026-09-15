"use client";

import { useMemo, useState, useRef } from "react";
import { Barras, Cartao, Indicador, Vazio } from "@/components/ui";
import {
  SITUACAO_ROTULO,
  TIPO_ROTULO,
  contarPor,
  descreverSegmento,
  estaAberto,
  formatarData,
  formatarDataObj,
  hoje,
  previsaoFim,
  situacaoDe,
} from "@/lib/calculos";
import type { Remanejamento } from "@/lib/tipos";

export default function RelatorioCliente({
  todos,
  setores,
}: {
  todos: Remanejamento[];
  setores: string[];
}) {
  const refObj = useRef(hoje());
  const ref = refObj.current;
  const [setoresSel, setSetoresSel] = useState<string[]>([]);
  const [situacaoSel, setSituacaoSel] = useState<string>("todos");
  const [formatoExport, setFormatoExport] = useState<"csv" | "pdf">("csv");

  const filtrados = useMemo(() => {
    return todos.filter((r) => {
      if (setoresSel.length > 0 && !setoresSel.includes(r.setor ?? ""))
        return false;
      if (situacaoSel === "abertos") return estaAberto(r, ref);
      if (situacaoSel === "encerrados")
        return !estaAberto(r, ref) && !!r.dataEncerramento;
      return true;
    });
  }, [todos, setoresSel, situacaoSel]); // ref é estável (useRef)

  const abertos = filtrados.filter((r) => estaAberto(r, ref));

  function toggleSetor(s: string) {
    setSetoresSel((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function exportarCSV() {
    const cabecalho = [
      "Nome",
      "Matrícula",
      "Setor",
      "Turno",
      "Início",
      "Situação",
      "Segmento",
      "Tipo",
      "Previsão Fim",
      "Encerramento",
      "Causa",
      "Contraindicação",
    ];

    const linhas = filtrados.map((r) => [
      r.nome,
      r.matricula ?? "",
      r.setor ?? "",
      r.turno ?? "",
      formatarData(r.dataInicio),
      SITUACAO_ROTULO[situacaoDe(r, ref)],
      descreverSegmento(r),
      TIPO_ROTULO[r.tipo],
      formatarDataObj(previsaoFim(r)),
      formatarData(r.dataEncerramento),
      r.causa ?? "",
      r.contraindicacao ?? "",
    ]);

    const csv = [cabecalho, ...linhas]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dataGeracao = formatarDataObj(ref);
  const descricaoFiltros = [
    setoresSel.length > 0
      ? `Setores: ${setoresSel.join(", ")}`
      : "Todos os setores",
    situacaoSel === "abertos"
      ? "Em aberto"
      : situacaoSel === "encerrados"
        ? "Encerrados"
        : "Todos",
  ].join(" · ");

  return (
    <div className="space-y-6">
      {/* Cabeçalho visível apenas na impressão */}
      <div className="so-impressao hidden">
        <h1 className="text-xl font-bold text-slate-900">
          Relatório de Remanejamentos — GTF Maringá
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Gerado em {dataGeracao} · {descricaoFiltros} · {filtrados.length} registros
        </p>
        <hr className="mt-3 border-slate-300" />
      </div>

      {/* Filtros — ocultos na impressão */}
      <div className="sem-impressao">
        <Cartao titulo="Filtros">
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Setores
              </p>
              <div className="flex flex-wrap gap-2">
                {setores.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSetor(s)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      setoresSel.includes(s)
                        ? "border-gtf-700 bg-gtf-700 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                {setoresSel.length > 0 && (
                  <button
                    onClick={() => setSetoresSel([])}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Situação
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "todos", r: "Todos" },
                  { v: "abertos", r: "Em aberto" },
                  { v: "encerrados", r: "Encerrados" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setSituacaoSel(o.v)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      situacaoSel === o.v
                        ? "border-gtf-700 bg-gtf-700 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {o.r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Cartao>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador rotulo="Registros" valor={filtrados.length} />
        <Indicador
          rotulo="Em aberto"
          valor={abertos.length}
          destaque={abertos.length > 0 ? "atencao" : undefined}
        />
        <Indicador
          rotulo="Encerrados"
          valor={filtrados.filter((r) => r.dataEncerramento).length}
        />
        <Indicador
          rotulo="Setores"
          valor={
            new Set(filtrados.map((r) => r.setor).filter(Boolean)).size
          }
        />
      </div>

      {/* Gráficos BI — ocultos na impressão */}
      <div className="graficos-impressao grid gap-6 lg:grid-cols-3">
        <Cartao titulo="Por setor">
          {filtrados.length === 0 ? (
            <Vazio>Sem dados.</Vazio>
          ) : (
            <Barras
              itens={contarPor(filtrados, (r) => r.setor)}
              href={(s) =>
                `/remanejamentos?setor=${encodeURIComponent(s)}`
              }
            />
          )}
        </Cartao>
        <Cartao titulo="Por região do corpo">
          {filtrados.length === 0 ? (
            <Vazio>Sem dados.</Vazio>
          ) : (
            <Barras
              itens={contarPor(filtrados, (r) => r.regiao)}
              href={(r) =>
                `/remanejamentos?regiao=${encodeURIComponent(r)}`
              }
            />
          )}
        </Cartao>
        <Cartao titulo="Por tipo">
          {filtrados.length === 0 ? (
            <Vazio>Sem dados.</Vazio>
          ) : (
            <Barras
              itens={contarPor(filtrados, (r) => TIPO_ROTULO[r.tipo])}
            />
          )}
        </Cartao>
      </div>

      {/* Tabela + botões de ação */}
      <Cartao
        titulo={`Colaboradores — ${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""}`}
      >
        <div className="sem-impressao flex flex-wrap items-center justify-end gap-3 px-5 py-3 border-b border-slate-100">
          {/* Seletor de formato */}
          <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm">
            {(["csv", "pdf"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormatoExport(f)}
                className={`px-3 py-1.5 font-medium transition ${
                  formatoExport === f
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              formatoExport === "csv" ? exportarCSV() : window.print()
            }
            disabled={filtrados.length === 0}
            className="rounded-md bg-gtf-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gtf-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {formatoExport === "csv" ? "Exportar CSV" : "Gerar PDF"}
          </button>
        </div>

        {filtrados.length === 0 ? (
          <Vazio>Nenhum registro com esses filtros.</Vazio>
        ) : (
          <div className="rolagem-x">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Colaborador</th>
                  <th className="px-3 py-2.5 font-medium">Setor / Turno</th>
                  <th className="px-3 py-2.5 font-medium">Segmento</th>
                  <th className="px-3 py-2.5 font-medium">Início</th>
                  <th className="px-3 py-2.5 font-medium">Previsão</th>
                  <th className="px-5 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((r) => {
                  const fim = previsaoFim(r);
                  const sit = situacaoDe(r, ref);
                  return (
                    <tr key={r.id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <a
                          href={`/colaboradores/${r.colaboradorId}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {r.nome}
                        </a>
                        <p className="text-xs text-slate-400">
                          {r.matricula ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {r.setor ?? "—"}
                        <p className="text-xs text-slate-400">
                          {r.turno ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {descreverSegmento(r)}
                        {r.causa && (
                          <p className="max-w-40 truncate text-xs text-slate-400">
                            {r.causa}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
                        {formatarData(r.dataInicio)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
                        {formatarDataObj(fim)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge-impressao inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            sit === "a_encerrar"
                              ? "bg-amber-50 text-amber-800 ring-amber-600/30"
                              : sit === "encerrado"
                                ? "bg-slate-100 text-slate-600 ring-slate-500/20"
                                : sit === "permanente"
                                  ? "bg-violet-50 text-violet-700 ring-violet-600/20"
                                  : sit === "sem_previsao"
                                    ? "bg-rose-50 text-rose-700 ring-rose-600/30"
                                    : "bg-sky-50 text-sky-700 ring-sky-600/20"
                          }`}
                        >
                          {SITUACAO_ROTULO[sit]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}
