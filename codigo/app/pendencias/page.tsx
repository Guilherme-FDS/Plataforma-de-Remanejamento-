import Link from "next/link";
import { BotaoResolverPendencia } from "@/components/BotaoResolverPendencia";
import { Cabecalho, Cartao, Indicador, Vazio } from "@/components/ui";
import { hoje, normalizar, pendenciasAutomaticas } from "@/lib/calculos";
import {
  listarColaboradores,
  listarPendencias,
  listarRemanejamentos,
  perfilAtual,
} from "@/lib/dados";
import type { Pendencia } from "@/lib/tipos";

const GRUPOS: {
  acao: Pendencia["acao"];
  titulo: string;
  descricao: string;
  cor: string;
}[] = [
  {
    acao: "revisar",
    titulo: "Precisa de decisão sua",
    descricao:
      "O importador não teve base para decidir sozinho. Nada foi alterado nestes campos.",
    cor: "border-amber-200",
  },
  {
    acao: "corrigido",
    titulo: "Corrigido automaticamente — confira",
    descricao:
      "Havia evidência suficiente para corrigir, mas a correção fica registrada aqui em vez de acontecer em silêncio.",
    cor: "border-sky-200",
  },
  {
    acao: "descartado",
    titulo: "Descartado",
    descricao: "Linhas sem nenhum dado aproveitável.",
    cor: "border-slate-200",
  },
];

export default async function Pendencias() {
  const ref = hoje();
  const [daImportacao, todos, colaboradores, perfil] = await Promise.all([
    listarPendencias(),
    listarRemanejamentos(),
    listarColaboradores(),
    perfilAtual(),
  ]);

  const podeResolver =
    perfil?.papel === "lancador" || perfil?.papel === "operador";

  const automaticas = pendenciasAutomaticas(todos, ref);

  const abertas = daImportacao.filter((p) => !p.resolvida);
  const resolvidas = daImportacao.filter((p) => p.resolvida);

  /**
   * A tabela da importação guarda o colaborador como texto livre, sem
   * vínculo com o cadastro — então o link só existe quando o nome bate com
   * alguém cadastrado. Nome escrito diferente fica sem link, e não há como
   * evitar isso nos registros antigos.
   */
  const idPorNome = new Map(
    colaboradores.map((c) => [normalizar(c.nome), c.id]),
  );

  return (
    <>
      <Cabecalho
        titulo="Pendências"
        descricao="O que está incompleto no sistema e o que a planilha original trouxe de inconsistente."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Indicador
          rotulo="Precisa de correção"
          valor={automaticas.length}
          nota="lançamentos vigentes com dado faltando"
          destaque={automaticas.length > 0 ? "atencao" : undefined}
          href={automaticas.length > 0 ? undefined : undefined}
        />
        <Indicador
          rotulo="Da importação"
          valor={abertas.length}
          nota="ainda não resolvidas"
        />
        <Indicador
          rotulo="Já resolvidas"
          valor={resolvidas.length}
          nota="da importação inicial"
        />
      </div>

      {/* ─────────────────────── Detectadas automaticamente ─────────────── */}

      <Cartao
        className="mt-6 border-amber-200"
        titulo="Precisa de correção"
        descricao="Calculado na hora, a partir dos casos vigentes. Assim que o campo é preenchido, o item sai desta lista sozinho."
      >
        {automaticas.length === 0 ? (
          <Vazio>Nenhum lançamento vigente com dado faltando.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {automaticas.map((p) => (
              <li
                key={p.remanejamentoId}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/colaboradores/${p.colaboradorId}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {p.nome}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {[p.matricula ?? "sem matrícula", p.setor]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.motivos.map((m) => (
                      <li
                        key={m}
                        className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
                {podeResolver && (
                  <Link
                    href={`/remanejamentos/${p.remanejamentoId}/editar`}
                    className="shrink-0 rounded-md bg-gtf-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gtf-800"
                  >
                    Corrigir
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {/* ─────────────────────────── Da importação ──────────────────────── */}

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Da importação inicial
      </h2>
      <p className="mt-0.5 mb-4 max-w-2xl text-sm text-slate-500">
        O que a planilha original trouxe de inconsistente, registrado uma única
        vez na criação do sistema. Não se atualiza sozinho — depois de conferir,
        marque como resolvida.
      </p>

      {GRUPOS.map((g) => {
        const itens = abertas.filter((p) => p.acao === g.acao);
        return (
          <Cartao
            key={g.acao}
            className={`mt-4 ${g.cor}`}
            titulo={g.titulo}
            descricao={g.descricao}
          >
            {itens.length === 0 ? (
              <Vazio>Nada aqui.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {itens.map((p) => (
                  <LinhaImportacao
                    key={p.id}
                    p={p}
                    colaboradorId={
                      p.colaborador ? idPorNome.get(normalizar(p.colaborador)) : undefined
                    }
                    podeResolver={podeResolver}
                  />
                ))}
              </ul>
            )}
          </Cartao>
        );
      })}

      {resolvidas.length > 0 && (
        <Cartao
          className="mt-4 border-emerald-200"
          titulo={`Resolvidas (${resolvidas.length})`}
          descricao="Já conferidas. Dá para reabrir se algo passou batido."
        >
          <ul className="divide-y divide-slate-100">
            {resolvidas.map((p) => (
              <LinhaImportacao
                key={p.id}
                p={p}
                colaboradorId={
                  p.colaborador ? idPorNome.get(normalizar(p.colaborador)) : undefined
                }
                podeResolver={podeResolver}
              />
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}

function LinhaImportacao({
  p,
  colaboradorId,
  podeResolver,
}: {
  p: Pendencia;
  colaboradorId?: number;
  podeResolver: boolean;
}) {
  return (
    <li
      className={`flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3 ${
        p.resolvida ? "opacity-60" : ""
      }`}
    >
      <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-slate-400">
        L{p.linha}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-900">
          {p.motivo}
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
            {p.campo}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {p.colaborador && (
            <>
              {colaboradorId ? (
                <Link
                  href={`/colaboradores/${colaboradorId}`}
                  className="font-medium text-slate-700 hover:underline"
                >
                  {p.colaborador}
                </Link>
              ) : (
                <span className="font-medium">{p.colaborador}</span>
              )}
              {" · "}
            </>
          )}
          valor original:{" "}
          <code className="rounded bg-slate-50 px-1 text-slate-600">
            {p.valorOriginal || "(vazio)"}
          </code>
        </p>
      </div>
      {podeResolver && (
        <BotaoResolverPendencia id={p.id} resolvida={p.resolvida} />
      )}
    </li>
  );
}
