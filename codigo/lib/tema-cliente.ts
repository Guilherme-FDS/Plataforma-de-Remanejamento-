"use client";

import { useEffect, useState } from "react";
import { COOKIE_TEMA } from "./tema";

const EVENTO = "gtf-tema";

export function definirTemaEscuro(escuro: boolean) {
  document.documentElement.classList.toggle("dark", escuro);
  document.cookie = `${COOKIE_TEMA}=${escuro ? "escuro" : "claro"}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(EVENTO));
}

/** Estado do tema sincronizado entre componentes (Nav, login). */
export function useTemaEscuro(): [boolean, () => void] {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const ler = () => setEscuro(document.documentElement.classList.contains("dark"));
    ler();
    window.addEventListener(EVENTO, ler);
    return () => window.removeEventListener(EVENTO, ler);
  }, []);

  return [escuro, () => definirTemaEscuro(!escuro)];
}
