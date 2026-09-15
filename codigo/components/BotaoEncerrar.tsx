"use client";

import { useState, useTransition } from "react";
import { encerrarRemanejamento } from "@/app/actions/remanejamentos";

export function BotaoEncerrar({ id }: { id: number }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/30 hover:bg-amber-50"
      >
        Encerrar
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="h-7 rounded border border-slate-300 px-2 text-xs text-slate-900"
      />
      <button
        disabled={pending || !data}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const res = await encerrarRemanejamento(id, data);
            if (!res.ok) setErro(res.erro ?? "Erro ao encerrar.");
            else setAberto(false);
          });
        }}
        className="rounded px-2 py-1 text-xs font-medium bg-slate-800 text-white transition hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "Aguarde…" : "Confirmar"}
      </button>
      <button
        onClick={() => {
          setAberto(false);
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
