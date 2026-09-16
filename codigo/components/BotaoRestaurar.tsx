"use client";

import { useState, useTransition } from "react";
import { restaurarRemanejamento } from "@/app/actions/remanejamentos";

export function BotaoRestaurar({ id }: { id: number }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const res = await restaurarRemanejamento(id);
            if (!res.ok) setErro(res.erro ?? "Erro ao restaurar.");
          });
        }}
        className="rounded px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/30 hover:bg-emerald-50 disabled:opacity-50"
      >
        {pending ? "Aguarde…" : "Restaurar"}
      </button>
      {erro && <span className="text-xs text-rose-600">{erro}</span>}
    </div>
  );
}
