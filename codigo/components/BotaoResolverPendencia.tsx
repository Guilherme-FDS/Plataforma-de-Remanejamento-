"use client";

import { useState, useTransition } from "react";
import {
  reabrirPendencia,
  resolverPendencia,
} from "@/app/actions/pendencias";

export function BotaoResolverPendencia({
  id,
  resolvida,
}: {
  id: number;
  resolvida: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        disabled={pending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const res = resolvida
              ? await reabrirPendencia(id)
              : await resolverPendencia(id);
            if (!res.ok) setErro(res.erro ?? "Erro.");
          });
        }}
        className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ring-1 ring-inset disabled:opacity-50 ${
          resolvida
            ? "text-slate-500 ring-slate-300 hover:bg-slate-50"
            : "text-emerald-700 ring-emerald-600/30 hover:bg-emerald-50"
        }`}
      >
        {pending ? "Aguarde…" : resolvida ? "Reabrir" : "Marcar resolvida"}
      </button>
      {erro && <span className="text-xs text-rose-600">{erro}</span>}
    </div>
  );
}
