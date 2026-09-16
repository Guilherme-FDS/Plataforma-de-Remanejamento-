"use client";

import { useState, useTransition } from "react";
import { excluirRemanejamento } from "@/app/actions/remanejamentos";

export function BotaoExcluir({ id }: { id: number }) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="rounded px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/30 hover:bg-rose-50"
      >
        Excluir
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-600">Confirmar exclusão?</span>
      <button
        disabled={pending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const res = await excluirRemanejamento(id);
            if (!res.ok) setErro(res.erro ?? "Erro ao excluir.");
          });
        }}
        className="rounded px-2 py-1 text-xs font-medium bg-rose-700 text-white transition hover:bg-rose-800 disabled:opacity-50"
      >
        {pending ? "Aguarde…" : "Sim, excluir"}
      </button>
      <button
        onClick={() => {
          setConfirmando(false);
          setErro(null);
        }}
        className="text-xs text-slate-400 hover:text-slate-700"
      >
        Cancelar
      </button>
      {erro && <span className="text-xs text-rose-600">{erro}</span>}
    </div>
  );
}
