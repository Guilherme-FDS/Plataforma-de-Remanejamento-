"use client";

import { useEffect } from "react";

/** Dispara a caixa de impressão do navegador assim que a página carrega. */
export default function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, []);
  return null;
}
