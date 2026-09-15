"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const ITENS = [
  { href: "/", rotulo: "Painel", icone: IconePainel },
  { href: "/remanejamentos", rotulo: "Casos", icone: IconeLista },
  { href: "/indicadores", rotulo: "Indicadores", icone: IconeGrafico },
  { href: "/relatorios", rotulo: "Relatórios", icone: IconeRelatorio },
  { href: "/pendencias", rotulo: "Pendências", icone: IconeAlerta },
  { href: "/admin", rotulo: "Config.", icone: IconeConfig },
];

function estaAtivo(caminho: string, href: string) {
  return href === "/" ? caminho === "/" : caminho.startsWith(href);
}

/** "Maria Calsavara" -> "MC". Primeiro e último nome, ignorando partículas. */
function iniciais(nome: string) {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => !["de", "da", "do", "das", "dos", "e"].includes(p.toLowerCase()));
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default function Nav({
  usuario,
  soLeitura = false,
}: {
  usuario: string | null;
  soLeitura?: boolean;
}) {
  const caminho = usePathname();

  // A tela de login não tem navegação.
  if (caminho.startsWith("/login")) return null;

  // Visualizador não gerencia dados: sem Config nem lançamento.
  const itens = soLeitura ? ITENS.filter((i) => i.href !== "/admin") : ITENS;

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
            {itens.map((item) => (
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
            {!soLeitura && (
              <Link
                href="/remanejamentos/novo"
                className="rounded-lg bg-gtf-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-gtf-800 active:bg-gtf-900"
              >
                <span className="sm:hidden">Lançar</span>
                <span className="hidden sm:inline">Novo lançamento</span>
              </Link>
            )}

            {usuario && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:gap-3 sm:pl-3">
                {/* Quem está logado precisa ficar visível: o aparelho é
                    compartilhado entre a equipe, e lançar no login errado
                    grava o profissional errado no prontuário. */}
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gtf-50 text-xs font-semibold text-gtf-700"
                  title={usuario}
                  aria-hidden
                >
                  {iniciais(usuario)}
                </span>
                <span className="hidden max-w-40 truncate text-sm text-slate-600 lg:inline">
                  {usuario}
                </span>

                <form action="/auth/sair" method="post" className="flex">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <IconeSair />
                    Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------ barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex">
          {itens.map((item) => {
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

function IconeRelatorio() {
  return (
    <Base>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
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

function IconeConfig() {
  return (
    <Base>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Base>
  );
}
