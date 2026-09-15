"use client";

import { useEffect } from "react";

/** Registra o service worker. Só em produção, para não atrapalhar o dev. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Instalação do PWA é um extra: falhar aqui não pode afetar o app.
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar);
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
