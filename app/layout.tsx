import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { perfilAtual } from "@/lib/dados";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma de Remanejamento",
  description:
    "Controle de restrições funcionais e remanejamentos — Medicina Ocupacional e Ergonomia",
};

/**
 * Nada neste app pode ser gerado em tempo de build: toda página depende da
 * sessão do usuário e de dados que a RLS filtra por quem está logado. Uma
 * página pré-renderizada seria, na melhor hipótese, vazia — e na pior,
 * conteúdo de um usuário servido a outro.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await perfilAtual();

  return (
    <html lang="pt-BR">
      <body>
        <Nav usuario={perfil?.nome ?? null} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
