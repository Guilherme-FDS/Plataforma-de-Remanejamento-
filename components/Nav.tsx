"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Painel" },
  { href: "/remanejamentos", rotulo: "Remanejamentos" },
  { href: "/indicadores", rotulo: "Indicadores" },
  { href: "/pendencias", rotulo: "Pendências" },
];

export default function Nav({ usuario }: { usuario: string | null }) {
  const caminho = usePathname();

  // A tela de login não tem navegação.
  if (caminho.startsWith("/login")) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            R
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Remanejamento
            <span className="ml-1.5 font-normal text-slate-400">Maringá</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {ITENS.map((item) => {
            const ativo =
              item.href === "/"
                ? caminho === "/"
                : caminho.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  ativo
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/remanejamentos/novo"
            className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Novo lançamento
          </Link>

          {usuario && (
            <>
              <span className="hidden text-sm text-slate-500 sm:inline">
                {usuario}
              </span>
              <form action="/auth/sair" method="post">
                <button
                  type="submit"
                  className="rounded-md px-2 py-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-900"
                >
                  Sair
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
