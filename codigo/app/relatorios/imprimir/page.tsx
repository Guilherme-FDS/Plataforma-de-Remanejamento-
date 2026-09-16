import AutoPrint from "@/components/AutoPrint";
import {
  SITUACAO_ROTULO,
  TIPO_ROTULO,
  descreverSegmento,
  filtrarRelatorio,
  formatarData,
  formatarDataObj,
  hoje,
  previsaoFim,
  situacaoDe,
  type SituacaoRelatorio,
} from "@/lib/calculos";
import { listarRemanejamentos } from "@/lib/dados";

/**
 * Página de impressão do relatório — aberta em aba nova a partir de
 * Relatórios. De propósito NÃO tem Nav, filtros nem gráficos: só o
 * cabeçalho e a tabela, para o PDF sair limpo (Nav.tsx esconde a barra
 * de navegação para esta rota).
 */
export default async function ImprimirRelatorio({
  searchParams,
}: {
  searchParams: { setores?: string; situacao?: string };
}) {
  const ref = hoje();
  const todos = await listarRemanejamentos();

  const setoresSel = searchParams.setores
    ? searchParams.setores.split(",").filter(Boolean)
    : [];
  const situacaoSel = (searchParams.situacao ?? "todos") as SituacaoRelatorio;

  const filtrados = filtrarRelatorio(
    todos,
    { setores: setoresSel, situacao: situacaoSel },
    ref,
  );

  const descricaoFiltros = [
    setoresSel.length > 0 ? `Setores: ${setoresSel.join(", ")}` : "Todos os setores",
    situacaoSel === "abertos"
      ? "Em aberto"
      : situacaoSel === "encerrados"
        ? "Encerrados"
        : "Todos",
  ].join(" · ");

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <AutoPrint />

      <h1 className="text-xl font-bold text-slate-900">
        Relatório de Remanejamentos — GTF Maringá
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Gerado em {formatarDataObj(ref)} · {descricaoFiltros} ·{" "}
        {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}
      </p>
      <hr className="mt-3 mb-5 border-slate-300" />

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Nenhum registro com esses filtros.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-medium">Colaborador</th>
              <th className="py-2 pr-3 font-medium">Setor / Turno</th>
              <th className="py-2 pr-3 font-medium">Segmento</th>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Início</th>
              <th className="py-2 pr-3 font-medium">Previsão</th>
              <th className="py-2 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((r) => {
              const fim = previsaoFim(r);
              return (
                <tr key={r.id} className="align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-slate-900">{r.nome}</p>
                    <p className="text-xs text-slate-400">{r.matricula ?? "—"}</p>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {r.setor ?? "—"}
                    <p className="text-xs text-slate-400">{r.turno ?? "—"}</p>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {descreverSegmento(r)}
                    {r.causa && (
                      <p className="text-xs text-slate-400">{r.causa}</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{TIPO_ROTULO[r.tipo]}</td>
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-slate-600">
                    {formatarData(r.dataInicio)}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-slate-600">
                    {formatarDataObj(fim)}
                  </td>
                  <td className="py-2 text-slate-600">
                    {SITUACAO_ROTULO[situacaoDe(r, ref)]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
