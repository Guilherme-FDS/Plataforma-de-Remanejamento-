import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import BloqueioMfa from "@/components/BloqueioMfa";
import Nav from "@/components/Nav";
import ServiceWorker from "@/components/ServiceWorker";
import {
  listarUnidadesPermitidas,
  perfilAtual,
  unidadeAtivaLeitura,
} from "@/lib/dados";
import { HEADER_CAMINHO } from "@/lib/caminho";
import { estadoMfa } from "@/lib/mfa";
import { TODAS_UNIDADES, unidadeAtivaCookie } from "@/lib/unidade-ativa";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GTF — Plataforma de Remanejamento",
    template: "%s · GTF Remanejamento",
  },
  description:
    "Controle de restrições funcionais e remanejamentos — Medicina Ocupacional e Ergonomia, GTF Maringá",
  applicationName: "GTF Remanejamento",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Remanejamento",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  // Conteúdo clínico: fora de buscador, sempre.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#00358E",
  width: "device-width",
  initialScale: 1,
  // Não trava o zoom: prender o pinch quebra acessibilidade para quem
  // precisa ampliar, e este app é usado por gente lendo texto clínico.
  maximumScale: 5,
  viewportFit: "cover", // respeita o notch do iPhone
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await perfilAtual();

  // Sem sessão, não há por que consultar unidades — evita uma chamada extra
  // na tela de login.
  const unidades = perfil ? await listarUnidadesPermitidas() : [];
  const unidadeAtiva =
    unidadeAtivaCookie() === TODAS_UNIDADES
      ? TODAS_UNIDADES
      : ((await unidadeAtivaLeitura()) ?? undefined);

  /* ---------------------------------------------------------- bloqueio MFA
   * A RLS (migration 0012) já recusa o dado; isto troca o painel vazio por
   * uma explicação. `/seguranca` fica de fora da lista, senão o aviso
   * cobriria a própria tela onde o cadastro é feito.
   */
  const caminho = headers().get(HEADER_CAMINHO) ?? "";
  const mfa = perfil ? await estadoMfa() : null;
  const rotaLivre =
    caminho.startsWith("/seguranca") ||
    caminho.startsWith("/login") ||
    caminho.startsWith("/auth/");
  const bloquearPorMfa = !!mfa?.bloqueado && !rotaLivre;

  return (
    <html lang="pt-BR">
      <body className="min-h-[100dvh] bg-slate-50 antialiased">
        <ServiceWorker />
        <Nav
          usuario={perfil?.nome ?? null}
          perfil={
            perfil
              ? {
                  nome: perfil.nome,
                  email: perfil.email,
                  funcao: perfil.funcao,
                  papel: perfil.papel,
                  admin: perfil.admin,
                  alcanceUnidades: perfil.alcance_unidades,
                  unidadeNome:
                    unidades.find((u) => u.id === perfil.unidade_id)?.nome ??
                    null,
                  mfaAtivo: !!mfa?.temFator,
                }
              : null
          }
          podeGerenciar={perfil?.papel === "lancador" || perfil?.papel === "operador"}
          unidades={unidades}
          unidadeAtiva={unidadeAtiva}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {bloquearPorMfa ? (
            <BloqueioMfa precisaConfirmar={!!mfa?.precisaConfirmar} />
          ) : (
            children
          )}
        </main>
      </body>
    </html>
  );
}
