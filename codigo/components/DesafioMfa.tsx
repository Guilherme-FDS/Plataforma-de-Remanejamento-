"use client";

import { useEffect, useRef, useState } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";

/**
 * Pede o código de 6 dígitos do autenticador e eleva a sessão para AAL2.
 *
 * Usado em dois lugares: logo depois da senha, no login, e como bloqueio
 * quando uma sessão antiga (aberta antes do cadastro do fator) tenta abrir
 * o app. Em ambos o efeito é o mesmo — sem AAL2 a RLS não devolve nada.
 */
export default function DesafioMfa({
  aoConfirmar,
  compacto = false,
}: {
  aoConfirmar: () => void;
  compacto?: boolean;
}) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const supabase = clienteNavegador();

    const { data: fatores, error: erroLista } =
      await supabase.auth.mfa.listFactors();
    if (erroLista) {
      setErro(erroLista.message);
      setEnviando(false);
      return;
    }

    const fator = fatores?.totp?.[0];
    if (!fator) {
      setErro(
        "Nenhum autenticador cadastrado nesta conta. Procure um administrador.",
      );
      setEnviando(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: fator.id,
      code: codigo.trim(),
    });

    if (error) {
      // A mensagem do GoTrue é em inglês e técnica demais para a tela.
      setErro(
        /invalid|incorrect/i.test(error.message)
          ? "Código incorreto ou expirado. O código muda a cada 30 segundos — tente o atual."
          : error.message,
      );
      setCodigo("");
      setEnviando(false);
      campoRef.current?.focus();
      return;
    }

    aoConfirmar();
  }

  return (
    <form onSubmit={confirmar} className={compacto ? "space-y-3" : "space-y-4"}>
      <div>
        <label
          htmlFor="codigo-mfa"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          Código do autenticador
        </label>
        <input
          id="codigo-mfa"
          ref={campoRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="000000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-center text-lg font-semibold tracking-[0.4em] text-slate-900 placeholder:font-normal placeholder:tracking-[0.4em] placeholder:text-slate-300 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600"
        />
      </div>

      {erro && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || codigo.length < 6}
        className="h-11 w-full rounded-lg bg-gtf-700 text-sm font-medium text-white transition hover:bg-gtf-800 disabled:bg-slate-300"
      >
        {enviando ? "Conferindo…" : "Confirmar"}
      </button>
    </form>
  );
}
