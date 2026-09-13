import { Cabecalho, Cartao, Indicador, Vazio } from "@/components/ui";
import { listarPendencias } from "@/lib/dados";
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

export default function Pendencias() {
  const todas = listarPendencias();

  return (
    <>
      <Cabecalho
        titulo="Pendências da importação"
        descricao="O que a planilha trouxe de inconsistente. Tudo está aqui em vez de ter sido silenciosamente ajustado — a decisão sobre dado clínico é sua, não do importador."
      />

      <div className="grid grid-cols-3 gap-4">
        {GRUPOS.map((g) => (
          <Indicador
            key={g.acao}
            rotulo={g.titulo.split(" — ")[0]}
            valor={todas.filter((p) => p.acao === g.acao).length}
            destaque={g.acao === "revisar" ? "atencao" : undefined}
          />
        ))}
      </div>

      {GRUPOS.map((g) => {
        const itens = todas.filter((p) => p.acao === g.acao);
        return (
          <Cartao
            key={g.acao}
            className={`mt-6 ${g.cor}`}
            titulo={g.titulo}
            descricao={g.descricao}
          >
            {itens.length === 0 ? (
              <Vazio>Nada aqui.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {itens.map((p, i) => (
                  <li
                    key={`${p.linha}-${p.campo}-${i}`}
                    className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3"
                  >
                    <span className="w-14 shrink-0 text-xs font-medium tabular-nums text-slate-400">
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
                          <span className="font-medium">{p.colaborador} · </span>
                        )}
                        valor original:{" "}
                        <code className="rounded bg-slate-50 px-1 text-slate-600">
                          {p.valorOriginal || "(vazio)"}
                        </code>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        );
      })}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        No sistema completo cada item vira uma ação: abrir o registro, corrigir
        e marcar como resolvido. No protótipo a lista é somente leitura.
      </p>
    </>
  );
}
