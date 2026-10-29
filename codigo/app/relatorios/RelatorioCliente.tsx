"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Vazio } from "@/components/ui";
import {
  RELATORIO_PADRAO,
  SITUACAO_ROTULO,
  TIPO_ROTULO,
  descreverSegmento,
  formatarData,
  formatarDataObj,
  hoje,
  montarRelatorio,
  previsaoFim,
  relatorioParaParams,
  situacaoDe,
  type OrdemCampo,
  type ParametrosRelatorio,
  type SituacaoRelatorio,
} from "@/lib/calculos";
import type { Remanejamento } from "@/lib/tipos";

const ORDENS: { v: OrdemCampo; r: string }[] = [
  { v: "inicio", r: "Data de início" },
  { v: "previsao", r: "Previsão de término" },
  { v: "nome", r: "Nome" },
  { v: "codigo", r: "Código" },
];

const SITUACOES: { v: SituacaoRelatorio; r: string }[] = [
  { v: "todos", r: "Todos" },
  { v: "abertos", r: "Abertos" },
  { v: "encerrados", r: "Encerrados" },
];

/** Valores distintos de um campo, com quantos registros cada um tem. */
function contagem(todos: Remanejamento[], campo: (r: Remanejamento) => string | null) {
  const m = new Map<string, number>();
  for (const r of todos) {
    const v = campo(r);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

/**
 * Relatórios — layout "painel lateral": filtros à esquerda aplicam na hora,
 * tabela à direita, e a barra acima da tabela exporta exatamente a lista
 * que está na tela. Os parâmetros ficam na URL (recarregar ou compartilhar
 * o link mantém o relatório) e o PDF é um link montado a partir deles pela
 * mesma função que a página de impressão usa para ler.
 */
export default function RelatorioCliente({
  todos,
  inicial,
}: {
  todos: Remanejamento[];
  inicial: ParametrosRelatorio;
}) {
  const refObj = useRef(hoje());
  const ref = refObj.current;
  const [p, setP] = useState<ParametrosRelatorio>(inicial);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const set = <K extends keyof ParametrosRelatorio>(k: K, v: ParametrosRelatorio[K]) =>
    setP((atual) => ({ ...atual, [k]: v }));

  const setores = useMemo(() => contagem(todos, (r) => r.setor), [todos]);
  // Todos marcados = nenhum filtro de setor: PDF diz "Todos os setores" e
  // a URL não carrega a lista inteira.
  const efetivo = useMemo(
    () => (p.setores.length === setores.length ? { ...p, setores: [] } : p),
    [p, setores.length],
  );

  const lista = useMemo(() => montarRelatorio(todos, efetivo, ref), [todos, efetivo, ref]);
  const query = relatorioParaParams(efetivo).toString();
  const resumido = p.modelo === "resumido";

  // Mantém a URL em dia sem gerar histórico a cada clique.
  useEffect(() => {
    window.history.replaceState(null, "", `/relatorios?${query}`);
  }, [query]);

  const turnos = useMemo(() => contagem(todos, (r) => r.turno), [todos]);
  const supervisores = useMemo(() => contagem(todos, (r) => r.supervisor), [todos]);

  const filtrosAtivos =
    efetivo.setores.length +
    (p.situacao !== "todos" ? 1 : 0) +
    (p.turno ? 1 : 0) +
    (p.supervisor ? 1 : 0) +
    (p.de || p.ate ? 1 : 0) +
    (p.busca.trim() ? 1 : 0);

  function toggleSetor(s: string) {
    set(
      "setores",
      p.setores.includes(s) ? p.setores.filter((x) => x !== s) : [...p.setores, s],
    );
  }

  function limparFiltros() {
    // Limpa só filtros; ordem e modelo são preferência de quem está usando.
    setP((atual) => ({ ...RELATORIO_PADRAO, ordem: atual.ordem, direcao: atual.direcao, modelo: atual.modelo }));
  }

  async function exportarXLSX() {
    // Import dinâmico: a biblioteca só entra no bundle de quem realmente
    // exporta, em vez de pesar o carregamento inicial de Relatórios.
    const XLSX = await import("xlsx");

    const linhas = resumido
      ? lista.map((r) => ({
          Nome: r.nome,
          Setor: r.setor ?? "",
          Turno: r.turno ?? "",
          Código: r.matricula ?? "",
          "Previsão Término": formatarDataObj(previsaoFim(r)),
          Supervisor: r.supervisor ?? "",
        }))
      : lista.map((r) => ({
          Nome: r.nome,
          Matrícula: r.matricula ?? "",
          Setor: r.setor ?? "",
          Turno: r.turno ?? "",
          Início: formatarData(r.dataInicio),
          Situação: SITUACAO_ROTULO[situacaoDe(r, ref)],
          Segmento: descreverSegmento(r),
          Tipo: TIPO_ROTULO[r.tipo],
          "Previsão Fim": formatarDataObj(previsaoFim(r)),
          Encerramento: formatarData(r.dataEncerramento),
          Causa: r.causa ?? "",
          Contraindicação: r.contraindicacao ?? "",
        }));

    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, resumido ? "Resumido" : "Relatório");
    const data = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(livro, `relatorio${resumido ? "_resumido" : ""}_${data}.xlsx`);
  }

  const vazio = lista.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
      {/* Fundo escuro da gaveta de filtros (só celular/tablet) */}
      {filtrosAbertos && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setFiltrosAbertos(false)}
          aria-hidden
        />
      )}

      {/* ------------------------------------------------------ filtros */}
      <aside
        className={`sem-impressao fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white shadow-xl transition-transform lg:sticky lg:bottom-auto lg:top-20 lg:z-auto lg:max-h-[calc(100vh-6rem)] lg:w-auto lg:translate-x-0 lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-none ${
          filtrosAbertos ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Filtros do relatório"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 lg:hidden">
          <span className="text-sm font-semibold text-slate-900">Filtros</span>
          <button
            onClick={() => setFiltrosAbertos(false)}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>

        <Grupo titulo="Buscar">
          <input
            type="search"
            value={p.busca}
            onChange={(e) => set("busca", e.target.value)}
            placeholder="Nome ou código"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-gtf-600 focus:outline-none focus:ring-2 focus:ring-gtf-100"
          />
        </Grupo>

        <Grupo titulo="Situação">
          <div className="flex overflow-hidden rounded-md border border-slate-200 text-sm">
            {SITUACOES.map((o) => (
              <button
                key={o.v}
                onClick={() => set("situacao", o.v)}
                className={`flex-1 px-2 py-1.5 font-medium transition ${
                  p.situacao === o.v
                    ? "bg-gtf-700 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {o.r}
              </button>
            ))}
          </div>
        </Grupo>

        <Grupo
          titulo="Setores"
          acao={
            <div className="flex gap-3">
              {p.setores.length < setores.length && (
                <button
                  onClick={() => set("setores", setores.map(([s]) => s))}
                  className="text-xs font-medium text-gtf-700 hover:underline"
                >
                  todos
                </button>
              )}
              {p.setores.length > 0 && (
                <button onClick={() => set("setores", [])} className="text-xs font-medium text-gtf-700 hover:underline">
                  limpar
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-0.5">
            {setores.map(([s, n]) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={p.setores.includes(s)}
                  onChange={() => toggleSetor(s)}
                  className="h-4 w-4 rounded border-slate-300 text-gtf-700 focus:ring-gtf-500"
                />
                <span className="min-w-0 flex-1 truncate">{s}</span>
                <span className="text-xs tabular-nums text-slate-400">{n}</span>
              </label>
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Turno">
          <div className="flex flex-wrap gap-1.5">
            {[["", "Todos"] as const, ...turnos.map(([t]) => [t, t] as const)].map(([v, r]) => (
              <button
                key={v || "todos"}
                onClick={() => set("turno", v)}
                className={`rounded-full border px-3 py-0.5 text-sm transition ${
                  p.turno === v
                    ? "border-gtf-700 bg-gtf-700 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Supervisor">
          <select
            value={p.supervisor}
            onChange={(e) => set("supervisor", e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-gtf-600 focus:outline-none focus:ring-2 focus:ring-gtf-100"
          >
            <option value="">Todos</option>
            {supervisores.map(([s, n]) => (
              <option key={s} value={s}>
                {s} ({n})
              </option>
            ))}
          </select>
        </Grupo>

        <Grupo titulo="Início entre">
          <div className="grid gap-1.5">
            <input
              type="date"
              value={p.de}
              max={p.ate || undefined}
              onChange={(e) => set("de", e.target.value)}
              aria-label="Início a partir de"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={p.ate}
              min={p.de || undefined}
              onChange={(e) => set("ate", e.target.value)}
              aria-label="Início até"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </Grupo>

        <div className="px-4 py-3">
          <button
            onClick={limparFiltros}
            disabled={filtrosAtivos === 0}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar filtros
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------ resultado */}
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
        <div className="sem-impressao sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-t-xl border-b border-slate-200 bg-white px-4 py-2.5 sm:top-16">
          <button
            onClick={() => setFiltrosAbertos(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
          </button>

          <p className="mr-auto text-sm text-slate-500">
            <strong className="font-semibold tabular-nums text-slate-900">{lista.length}</strong>{" "}
            registro{lista.length !== 1 ? "s" : ""}
          </p>

          <div className="flex overflow-hidden rounded-md border border-slate-200 text-sm">
            {(["completo", "resumido"] as const).map((m) => (
              <button
                key={m}
                onClick={() => set("modelo", m)}
                className={`px-3 py-1.5 font-medium capitalize transition ${
                  p.modelo === m ? "bg-gtf-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <select
              value={p.ordem}
              onChange={(e) => set("ordem", e.target.value as OrdemCampo)}
              aria-label="Ordenar por"
              className="rounded-md border border-slate-300 py-1.5 pl-2 pr-7 text-sm"
            >
              {ORDENS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.r}
                </option>
              ))}
            </select>
            <button
              onClick={() => set("direcao", p.direcao === "asc" ? "desc" : "asc")}
              title={p.direcao === "asc" ? "Crescente — clique para inverter" : "Decrescente — clique para inverter"}
              aria-label={p.direcao === "asc" ? "Ordem crescente" : "Ordem decrescente"}
              className="flex h-[34px] items-center gap-1 rounded-md border border-slate-300 px-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {p.direcao === "asc" ? "↑" : "↓"}
              <span className="hidden sm:inline">{p.direcao === "asc" ? "Cresc." : "Decresc."}</span>
            </button>
          </div>

          <button
            onClick={exportarXLSX}
            disabled={vazio}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            XLSX
          </button>
          {/* Link real (não window.open num clique): o PDF abre com os
              parâmetros que estão na tela neste instante. */}
          <a
            href={`/relatorios/imprimir?${query}`}
            target="_blank"
            rel="noopener"
            aria-disabled={vazio}
            onClick={(e) => vazio && e.preventDefault()}
            className={`rounded-md px-4 py-1.5 text-sm font-medium text-white transition ${
              vazio ? "pointer-events-none bg-slate-300" : "bg-gtf-700 hover:bg-gtf-800"
            }`}
          >
            Gerar PDF
          </a>
        </div>

        {vazio ? (
          <Vazio>Nenhum registro com esses filtros.</Vazio>
        ) : resumido ? (
          <div className="rolagem-x">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Colaborador</th>
                  <th className="px-3 py-2.5 font-medium">Setor</th>
                  <th className="px-3 py-2.5 font-medium">Turno</th>
                  <th className="px-3 py-2.5 font-medium">Código</th>
                  <th className="px-3 py-2.5 font-medium">Previsão término</th>
                  <th className="px-4 py-2.5 font-medium">Supervisor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <a href={`/colaboradores/${r.colaboradorId}`} className="font-medium text-slate-900 hover:underline">
                        {r.nome}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.setor ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.turno ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600">{r.matricula ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                      {formatarDataObj(previsaoFim(r))}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.supervisor ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rolagem-x">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Colaborador</th>
                  <th className="px-3 py-2.5 font-medium">Setor / Turno</th>
                  <th className="px-3 py-2.5 font-medium">Segmento</th>
                  <th className="px-3 py-2.5 font-medium">Início</th>
                  <th className="px-3 py-2.5 font-medium">Previsão</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((r) => {
                  const sit = situacaoDe(r, ref);
                  return (
                    <tr key={r.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <a href={`/colaboradores/${r.colaboradorId}`} className="font-medium text-slate-900 hover:underline">
                          {r.nome}
                        </a>
                        <p className="text-xs text-slate-500">{r.matricula ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {r.setor ?? "—"}
                        <p className="text-xs text-slate-500">{r.turno ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {descreverSegmento(r)}
                        {r.causa && <p className="max-w-40 truncate text-xs text-slate-500">{r.causa}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                        {formatarData(r.dataInicio)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                        {formatarDataObj(previsaoFim(r))}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
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
      </section>
    </div>
  );
}

function Grupo({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
        {acao}
      </div>
      {children}
    </div>
  );
}
