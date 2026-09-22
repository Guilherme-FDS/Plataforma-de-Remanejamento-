import Link from "next/link";
import { Suspense } from "react";
import Filtros from "@/components/Filtros";
import { BotaoEncerrar } from "@/components/BotaoEncerrar";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { BotaoRestaurar } from "@/components/BotaoRestaurar";
import { Cabecalho, Cartao, Selo, Vazio } from "@/components/ui";
import {
  TIPO_ROTULO,
  anoDe,
  anosDisponiveis,
  descreverDuracao,
  descreverSegmento,
  diasAteFim,
  estaAberto,
  formatarData,
  formatarDataObj,
  hoje,
  previsaoFim,
  normalizar,
  situacaoDe,
} from "@/lib/calculos";
import {
  listarRemanejamentos,
  listarRemanejamentosExcluidos,
  obterListas,
  perfilAtual,
} from "@/lib/dados";
import type { Remanejamento, Situacao } from "@/lib/tipos";

type Busca = Record<string, string | undefined>;

const ORDENACOES: { valor: string; rotulo: string }[] = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "antigos", rotulo: "Mais antigos" },
];

const SITUACOES: { valor: string; rotulo: string }[] = [
  { valor: "abertos", rotulo: "Vigentes (todos abertos)" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "a_encerrar", rotulo: "A encerrar" },
  { valor: "sem_previsao", rotulo: "Sem previsão" },
  { valor: "permanente", rotulo: "Permanente" },
  { valor: "acompanhamento", rotulo: "Acompanhamento" },
  { valor: "encerrado", rotulo: "Encerrado" },
];

export default async function ListaRemanejamentos({
  searchParams,
}: {
  searchParams: Busca;
}) {
  const ref = hoje();
  const verExcluidos = searchParams.visao === "excluidos";

  const [listas, todos, perfil] = await Promise.all([
    obterListas(),
    verExcluidos ? listarRemanejamentosExcluidos() : listarRemanejamentos(),
    perfilAtual(),
  ]);
  const podeEditar = perfil?.papel === "lancador" || perfil?.papel === "operador";
  const podeExcluir = perfil?.papel === "operador";
  const anos = anosDisponiveis(todos);

  if (verExcluidos) {
    return (
      <>
        <Cabecalho
          titulo="Excluídos"
          descricao={`${todos.length} lançamento${todos.length !== 1 ? "s" : ""} excluído${todos.length !== 1 ? "s" : ""}.`}
          acao={
            <Link
              href="/remanejamentos"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Voltar aos casos
            </Link>
          }
        />
        <Cartao>
          {todos.length === 0 ? (
            <Vazio>Nenhum lançamento excluído.</Vazio>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todos.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {r.nome}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[r.setor, r.turno, descreverSegmento(r)]
                        .filter(Boolean)
                        .join(" · ")}
                      {r.excluidoEm &&
                        ` · excluído em ${formatarDataObj(new Date(r.excluidoEm))}`}
                    </p>
                  </div>
                  {podeExcluir && <BotaoRestaurar id={r.id} />}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </>
    );
  }

  const filtrados = todos.filter((r) => {
    if (searchParams.setor && r.setor !== searchParams.setor) return false;
    if (searchParams.turno && r.turno !== searchParams.turno) return false;
    if (searchParams.tipo && r.tipo !== searchParams.tipo) return false;
    if (searchParams.regiao && r.regiao !== searchParams.regiao) return false;
    if (searchParams.ano && String(anoDe(r)) !== searchParams.ano) return false;

    const sit = searchParams.situacao;
    if (sit) {
      if (sit === "abertos") {
        if (!estaAberto(r, ref)) return false;
      } else if (situacaoDe(r, ref) !== (sit as Situacao)) {
        return false;
      }
    }

    if (searchParams.busca) {
      const alvo = normalizar(`${r.nome} ${r.matricula ?? ""}`);
      if (!alvo.includes(normalizar(searchParams.busca))) return false;
    }
    return true;
  });

  const antigosPrimeiro = searchParams.ordenacao === "antigos";
  const ordenados = [...filtrados].sort((a, b) =>
    antigosPrimeiro
      ? (a.dataInicio ?? "").localeCompare(b.dataInicio ?? "")
      : (b.dataInicio ?? "").localeCompare(a.dataInicio ?? ""),
  );

  const regioes = [...new Set(todos.map((r) => r.regiao).filter(Boolean))]
    .sort() as string[];

  return (
    <>
      <Cabecalho
        titulo="Remanejamentos"
        descricao={`${ordenados.length} de ${todos.length} registros.`}
        acao={
          podeExcluir ? (
            <Link
              href="/remanejamentos?visao=excluidos"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Ver excluídos
            </Link>
          ) : undefined
        }
      />

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filtros
          campos={[
            { nome: "situacao", rotulo: "Situação", opcoes: SITUACOES },
            {
              nome: "setor",
              rotulo: "Setor",
              opcoes: listas.setores.map((s) => ({ valor: s, rotulo: s })),
            },
            {
              nome: "turno",
              rotulo: "Turno",
              opcoes: listas.turnos.map((t) => ({ valor: t, rotulo: t })),
            },
            {
              nome: "regiao",
              rotulo: "Região do corpo",
              opcoes: regioes.map((r) => ({ valor: r, rotulo: r })),
            },
            {
              nome: "tipo",
              rotulo: "Tipo",
              opcoes: listas.tipos.map((t) => ({
                valor: t.id,
                rotulo: t.rotulo,
              })),
            },
            {
              nome: "ano",
              rotulo: "Ano",
              opcoes: anos.map((a) => ({ valor: String(a), rotulo: String(a) })),
            },
            {
              nome: "ordenacao",
              rotulo: "Ordenar",
              opcoes: ORDENACOES,
            },
          ]}
        />
      </Suspense>

      <Cartao>
        {ordenados.length === 0 ? (
          <Vazio>Nenhum registro com esses filtros.</Vazio>
        ) : (
          <div className="rolagem-x">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Colaborador</th>
                  <th className="px-3 py-2.5 font-medium">Setor / Turno</th>
                  <th className="px-3 py-2.5 font-medium">Segmento</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Início</th>
                  <th className="px-3 py-2.5 font-medium">Duração</th>
                  <th className="px-3 py-2.5 font-medium">Previsão</th>
                  <th className="px-5 py-2.5 font-medium">Situação</th>
                  <th className="px-3 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenados.map((r) => (
                  <Linha
                    key={r.id}
                    r={r}
                    ref_={ref}
                    podeEditar={podeEditar}
                    podeExcluir={podeExcluir}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}

function Linha({
  r,
  ref_,
  podeEditar,
  podeExcluir,
}: {
  r: Remanejamento;
  ref_: Date;
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const fim = previsaoFim(r);
  const dias = diasAteFim(r, ref_);

  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="px-5 py-3">
        <Link
          href={`/colaboradores/${r.colaboradorId}`}
          className="font-medium text-slate-900 hover:underline"
        >
          {r.nome}
        </Link>
        <p className="text-xs text-slate-400">{r.matricula}</p>
      </td>
      <td className="px-3 py-3 text-slate-600">
        {r.setor ?? "—"}
        <p className="text-xs text-slate-400">{r.turno ?? "—"}</p>
      </td>
      <td className="px-3 py-3 text-slate-600">
        {descreverSegmento(r)}
        <p className="max-w-56 truncate text-xs text-slate-400" title={r.causa ?? ""}>
          {r.causa ?? ""}
        </p>
      </td>
      <td className="px-3 py-3 text-slate-600">{TIPO_ROTULO[r.tipo]}</td>
      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
        {formatarData(r.dataInicio)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
        {descreverDuracao(r)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
        {formatarDataObj(fim)}
        {dias !== null && dias >= 0 && dias <= 30 && (
          <p className="text-xs text-sky-600">em {dias}d</p>
        )}
      </td>
      <td className="px-5 py-3">
        <Selo situacao={situacaoDe(r, ref_)} />
      </td>
      <td className="px-3 py-3">
        {podeEditar &&
          (situacaoDe(r, ref_) === "a_encerrar" ||
            situacaoDe(r, ref_) === "em_andamento" ||
            situacaoDe(r, ref_) === "permanente" ||
            situacaoDe(r, ref_) === "acompanhamento" ||
            situacaoDe(r, ref_) === "sem_previsao") && (
          <div className="flex flex-col gap-1">
            <Link
              href={`/remanejamentos/${r.id}/editar`}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Editar
            </Link>
            <BotaoEncerrar id={r.id} />
            {podeExcluir && <BotaoExcluir id={r.id} />}
          </div>
        )}
      </td>
    </tr>
  );
}
