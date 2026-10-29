import AutoPrint from "@/components/AutoPrint";
import Logo from "@/components/Logo";
import {
  SITUACAO_ROTULO,
  TIPO_ROTULO,
  descreverRelatorio,
  descreverSegmento,
  formatarData,
  formatarDataObj,
  hoje,
  montarRelatorio,
  previsaoFim,
  relatorioDeParams,
  situacaoDe,
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
  searchParams: Record<string, string | undefined>;
}) {
  const ref = hoje();
  const todos = await listarRemanejamentos();

  // Mesma leitura e mesma montagem da tela de Relatórios.
  const parametros = relatorioDeParams(searchParams);
  const filtrados = montarRelatorio(todos, parametros, ref);
  const resumido = parametros.modelo === "resumido";
  const descricaoFiltros = descreverRelatorio(parametros);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <AutoPrint />

      <Logo className="mb-3 h-10 w-auto text-gtf-700" />
      <h1 className="text-xl font-bold text-slate-900">
        {resumido
          ? "Relatório Resumido de Remanejamentos — GTF Maringá"
          : "Relatório de Remanejamentos — GTF Maringá"}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Gerado em {formatarDataObj(ref)} · {descricaoFiltros} ·{" "}
        {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}
      </p>
      <hr className="mt-3 mb-5 border-slate-300" />

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Nenhum registro com esses filtros.
        </p>
      ) : resumido ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-medium">Colaborador</th>
              <th className="py-2 pr-3 font-medium">Setor</th>
              <th className="py-2 pr-3 font-medium">Turno</th>
              <th className="py-2 pr-3 font-medium">Código</th>
              <th className="py-2 pr-3 font-medium">Previsão término</th>
              <th className="py-2 font-medium">Supervisor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="py-2 pr-3 font-medium text-slate-900">{r.nome}</td>
                <td className="py-2 pr-3 text-slate-600">{r.setor ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-600">{r.turno ?? "—"}</td>
                <td className="py-2 pr-3 tabular-nums text-slate-600">
                  {r.matricula ?? "—"}
                </td>
                <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-slate-600">
                  {formatarDataObj(previsaoFim(r))}
                </td>
                <td className="py-2 text-slate-600">{r.supervisor ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
                    <p className="text-xs text-slate-500">{r.matricula ?? "—"}</p>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {r.setor ?? "—"}
                    <p className="text-xs text-slate-500">{r.turno ?? "—"}</p>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {descreverSegmento(r)}
                    {r.causa && (
                      <p className="text-xs text-slate-500">{r.causa}</p>
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
    </div>
  );
}
