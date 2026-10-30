"use client";

import { useEffect, useState } from "react";
import FormularioLogin from "./FormularioLogin";
import Logo from "./Logo";

const CHAVE_TEMA = "gtf-login-tema";

/**
 * Moldura da tela de login: fundo azul GTF com marcas d'água, cartão
 * central e alternância claro/escuro. O tema escuro troca o fundo inteiro,
 * não só o cartão. A escolha fica no navegador de quem usa (preferência
 * visual, não dado) e vale só para esta tela.
 */
export default function TelaLogin({
  destino,
  motivo,
  erro,
}: {
  destino: string;
  motivo?: string;
  erro?: string;
}) {
  const [escuro, setEscuro] = useState(false);

  // Lido depois de montar, para o HTML do servidor e o do navegador baterem.
  useEffect(() => {
    try {
      setEscuro(localStorage.getItem(CHAVE_TEMA) === "escuro");
    } catch {}
  }, []);

  function alternarTema() {
    setEscuro((v) => {
      try {
        localStorage.setItem(CHAVE_TEMA, v ? "claro" : "escuro");
      } catch {}
      return !v;
    });
  }

  return (
    <>
      {/* Se a tela for baixa e precisar rolar, a barra de rolagem fica
          escura em vez de uma faixa branca ao lado do fundo azul. */}
      <style>{`html{background:${escuro ? "#03070F" : "#001433"};color-scheme:dark}`}</style>
      {/* Fundo: azul GTF; o escuro entra por cima com fade. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_0%,#0B4FC0_0%,transparent_60%),radial-gradient(700px_500px_at_100%_100%,#00358E_0%,transparent_60%),linear-gradient(160deg,#002B73,#001433)]" />
        <div
          className={`absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_0%,#0B1E44_0%,transparent_60%),radial-gradient(700px_500px_at_100%_100%,#0A1A3A_0%,transparent_60%),linear-gradient(160deg,#081226,#03070F)] transition-opacity duration-300 ${
            escuro ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_60%_at_50%_45%,#000,transparent)]" />
        <Logo
          titulo=""
          className={`absolute -bottom-10 left-[2vw] h-auto w-[min(520px,42vw)] text-white ${escuro ? "opacity-[.06]" : "opacity-[.09]"}`}
        />
        <Logo
          titulo=""
          className={`absolute right-[3vw] top-[70px] h-auto w-[min(460px,36vw)] text-white ${escuro ? "opacity-[.05]" : "opacity-[.08]"}`}
        />
      </div>

      <div className="relative z-10 flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
        <header className="flex items-center justify-between">
          <Logo className="h-7 w-auto text-white" />
          <button
            type="button"
            onClick={alternarTema}
            aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
            title={escuro ? "Tema claro" : "Tema escuro"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          >
            {escuro ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
                <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
              </svg>
            )}
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center py-5">
          <div
            className={`w-full max-w-[440px] rounded-2xl px-5 py-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,.55)] ring-1 transition-colors sm:px-8 sm:py-8 ${
              escuro ? "bg-[#111A2C] text-slate-100 ring-white/10" : "bg-white text-slate-900 ring-white/5"
            }`}
          >
            <div
              className={`mb-6 flex items-center gap-3 border-b pb-5 ${
                escuro ? "border-[#22304A]" : "border-slate-200"
              }`}
            >
              <Logo className={`h-8 w-auto shrink-0 ${escuro ? "text-white" : "text-gtf-700"}`} />
              <div>
                <p className="text-sm font-semibold">Plataforma de Remanejamento</p>
                <p className={`text-xs ${escuro ? "text-slate-400" : "text-slate-500"}`}>
                  Medicina Ocupacional e Ergonomia
                </p>
              </div>
            </div>

            <FormularioLogin destino={destino} motivo={motivo} erroLink={erro} escuro={escuro} />
          </div>
        </div>

        <p className="pb-2 text-center text-xs text-white/55">© {new Date().getFullYear()} GTF · Conexão segura</p>
      </div>
    </>
  );
}
