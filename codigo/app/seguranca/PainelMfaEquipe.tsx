"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { definirMfaObrigatorio, type ResumoMfa } from "@/app/actions/seguranca";
import { Cartao } from "@/components/ui";

/**
 * Só o admin vê. Mostra a adesão da equipe e deixa ligar a exigência para
 * todo mundo.
 *
 * O botão fica travado enquanto houver gente sem autenticador: ligar antes
 * disso não é "mais seguro", é tirar a equipe do ar. A lista de quem falta
 * é o que transforma "ligar o MFA" numa tarefa com fim, em vez de um susto.
 */
export default function PainelMfaEquipe({
  obrigatorio,
  resumo,
}: {
  obrigatorio: boolean;
  resumo: ResumoMfa;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const todosAderiram = resumo.faltando.length === 0;

  function alternar(valor: boolean) {
    setErro(null);
    iniciar(async () => {
      const res = await definirMfaObrigatorio(valor);
      if (!res.ok) setErro(res.erro ?? "Falha ao salvar.");
      router.refresh();
    });
  }

  return (
    <Cartao
      titulo="Verificação em duas etapas da equipe"
      descricao="Visível só para administradores."
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {resumo.comFator}
          </span>
          <span className="text-sm text-slate-500">
            de {resumo.total} pessoas ativas já cadastraram
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${todosAderiram ? "bg-emerald-600" : "bg-amber-500"}`}
            style={{
              width: `${resumo.total > 0 ? (resumo.comFator / resumo.total) * 100 : 0}%`,
            }}
          />
        </div>

        {!todosAderiram && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Ainda sem autenticador
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {resumo.faltando.map((nome) => (
                <li
                  key={nome}
                  className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
                >
                  {nome}
                </li>
              ))}
            </ul>
          </div>
        )}

        {erro && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
            {erro}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              Exigir de todos
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {obrigatorio
                ? "Ligado. Quem não tiver autenticador não enxerga dado clínico."
                : todosAderiram
                  ? "Todo mundo já aderiu — pode ligar com segurança."
                  : `Trava até que ${resumo.faltando.length === 1 ? "a última pessoa cadastre" : `as ${resumo.faltando.length} pessoas acima cadastrem`}.`}
            </p>
          </div>
          <button
            onClick={() => alternar(!obrigatorio)}
            disabled={pendente || (!obrigatorio && !todosAderiram)}
            className={`h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              obrigatorio
                ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                : "bg-gtf-700 text-white hover:bg-gtf-800"
            }`}
          >
            {pendente ? "Salvando…" : obrigatorio ? "Desligar" : "Ligar"}
          </button>
        </div>
      </div>
    </Cartao>
  );
}
