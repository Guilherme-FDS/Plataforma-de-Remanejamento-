"use client";

import { useEffect } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";

/**
 * Boundary de erro do App Router — pega qualquer exceção não tratada
 * durante a renderização de uma página e mostra isto em vez de uma tela
 * branca. Não cobre o layout raiz (para isso seria `global-error.tsx`,
 * que substituiria até o `<html>` — não vale a pena aqui, o layout raiz já
 * tem os próprios catches em `perfilAtual()`/`estadoMfa()`).
 *
 * Loga em `erros_aplicacao` (migration 0015) do lado do navegador — é o
 * único jeito de capturar um erro de renderização de client component,
 * que nunca passa pelo servidor.
 */
export default function ErroApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro de renderização:", error);
    clienteNavegador()
      .from("erros_aplicacao")
      .insert({
        contexto: "app/error.tsx",
        mensagem: error.message || "Erro sem mensagem",
        rota: window.location.pathname,
      })
      .then(
        () => {},
        () => {}, // best-effort — não deixa o boundary quebrar por causa do log
      );
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-900">
        Algo deu errado nesta tela
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
        O erro já foi registrado. Tente de novo — se continuar, avise um
        administrador.
      </p>
      <button
        onClick={reset}
        className="mt-6 h-11 rounded-lg bg-gtf-700 px-5 text-sm font-medium text-white transition hover:bg-gtf-800"
      >
        Tentar de novo
      </button>
    </div>
  );
}
