"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const ITENS = [
  { href: "/", rotulo: "Painel", icone: IconePainel },
  { href: "/remanejamentos", rotulo: "Casos", icone: IconeLista },
  { href: "/indicadores", rotulo: "Indicadores", icone: IconeGrafico },
  { href: "/pendencias", rotulo: "Pendências", icone: IconeAlerta },
];

function estaAtivo(caminho: string, href: string) {
  return href === "/" ? caminho === "/" : caminho.startsWith(href);
}

export default function Nav({ usuario }: { usuario: string | null }) {
  const caminho = usePathname();

  // A tela de login não tem navegação.
  if (caminho.startsWith("/login")) return null;

  return (
    <>
      {/* ----------------------------------------------------- barra do topo */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-x-6 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Logo className="h-6 w-auto text-gtf-700 sm:h-7" />
            <span className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline">
              Remanejamento
              <span className="ml-1.5 font-normal text-slate-400">Maringá</span>
            </span>
          </Link>

          {/* Navegação no topo só a partir de sm; no celular vai embaixo. */}
          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            {ITENS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  estaAtivo(caminho, item.href)
                    ? "bg-gtf-50 text-gtf-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
            <Link
              href="/remanejamentos/novo"
              className="rounded-lg bg-gtf-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-gtf-800 active:bg-gtf-900"
            >
              <span className="sm:hidden">Lançar</span>
              <span className="hidden sm:inline">Novo lançamento</span>
            </Link>

            {usuario && (
              <>
                <span className="hidden max-w-40 truncate text-sm text-slate-500 lg:inline">
                  {usuario}
                </span>
                <form action="/auth/sair" method="post" className="flex">
                  <button
                    type="submit"
                    aria-label="Sair"
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <IconeSair />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------ barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex">
          {ITENS.map((item) => {
            const ativo = estaAtivo(caminho, item.href);
            const Icone = item.icone;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  ativo ? "text-gtf-700" : "text-slate-400"
                }`}
              >
                <Icone />
                {item.rotulo}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Espaço para a barra inferior não cobrir o fim do conteúdo. */}
      <div className="h-16 sm:hidden" aria-hidden />
    </>
  );
}

/* --------------------------------------------------------------- ícones */

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Base({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden {...traco}>
      {children}
    </svg>
  );
}

function IconePainel() {
  return (
    <Base>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Base>
  );
}

function IconeLista() {
  return (
    <Base>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </Base>
  );
}

function IconeGrafico() {
  return (
    <Base>
      <path d="M3 21h18M7 21v-8M12 21V6M17 21v-5" />
    </Base>
  );
}

function IconeAlerta() {
  return (
    <Base>
      <path d="M12 3.5 2.8 19a1 1 0 0 0 .87 1.5h16.66a1 1 0 0 0 .87-1.5L12 3.5Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </Base>
  );
}

function IconeSair() {
  return (
    <Base>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h12" />
    </Base>
  );
}
