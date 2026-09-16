import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import ServiceWorker from "@/components/ServiceWorker";
import {
  listarUnidadesPermitidas,
  perfilAtual,
  unidadeAtivaLeitura,
} from "@/lib/dados";
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
                }
              : null
          }
          podeGerenciar={perfil?.papel === "lancador" || perfil?.papel === "operador"}
          unidades={unidades}
          unidadeAtiva={unidadeAtiva}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
