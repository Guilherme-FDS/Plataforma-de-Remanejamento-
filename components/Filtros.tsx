"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export interface CampoFiltro {
  nome: string;
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
}

export default function Filtros({
  campos,
  temBusca = true,
}: {
  campos: CampoFiltro[];
  temBusca?: boolean;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get("busca") ?? "");

  const aplicar = useCallback(
    (nome: string, valor: string) => {
      const novos = new URLSearchParams(params.toString());
      if (valor) novos.set(nome, valor);
      else novos.delete(nome);
      router.replace(`${caminho}?${novos.toString()}`, { scroll: false });
    },
    [caminho, params, router],
  );

  // Busca com atraso, para não navegar a cada tecla.
  useEffect(() => {
    const atual = params.get("busca") ?? "";
    if (busca === atual) return;
    const t = setTimeout(() => aplicar("busca", busca), 300);
    return () => clearTimeout(t);
  }, [busca, params, aplicar]);

  const ativos = campos.filter((c) => params.get(c.nome)).length;
  const temFiltro = ativos > 0 || (params.get("busca") ?? "") !== "";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {temBusca && (
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome ou matrícula…"
          className="h-9 w-56 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      )}

      {campos.map((campo) => (
        <select
          key={campo.nome}
          value={params.get(campo.nome) ?? ""}
          onChange={(e) => aplicar(campo.nome, e.target.value)}
          className={`h-9 rounded-md border bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 ${
            params.get(campo.nome)
              ? "border-slate-900 font-medium text-slate-900"
              : "border-slate-300 text-slate-600"
          }`}
        >
          <option value="">{campo.rotulo}</option>
          {campo.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ))}

      {temFiltro && (
        <button
          type="button"
          onClick={() => {
            setBusca("");
            router.replace(caminho, { scroll: false });
          }}
          className="h-9 rounded-md px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
