import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA. Gerado pelo Next (app/manifest.ts) em vez de um JSON
 * estático para o conteúdo acompanhar o resto do app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GTF — Plataforma de Remanejamento",
    short_name: "Remanejamento",
    description:
      "Controle de restrições funcionais e remanejamentos — Medicina Ocupacional e Ergonomia, GTF Maringá",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFFFF",
    theme_color: "#00358E",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["medical", "productivity", "business"],
    icons: [
      {
        src: "/icone-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Folga maior: o Android recorta o ícone em círculo, losango etc.
        src: "/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Novo lançamento",
        short_name: "Lançar",
        url: "/remanejamentos/novo",
      },
      { name: "Indicadores", short_name: "Indicadores", url: "/indicadores" },
    ],
  };
}
