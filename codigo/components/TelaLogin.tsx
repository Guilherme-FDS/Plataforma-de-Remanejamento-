"use client";

import BotaoTema from "./BotaoTema";
import FormularioLogin from "./FormularioLogin";
import Logo from "./Logo";
import { useTemaEscuro } from "@/lib/tema-cliente";

/**
 * Moldura da tela de login: fundo azul GTF com marcas d'água, cartão
 * central. O tema claro/escuro é o mesmo da plataforma (lib/tema.ts): no
 * escuro troca o fundo inteiro, e o cartão acompanha pela paleta global.
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
  const [escuro] = useTemaEscuro();

  return (
    <>
      {/* Se a tela for baixa e precisar rolar, a barra de rolagem fica
          escura em vez de uma faixa branca ao lado do fundo azul; sem a
          reserva de espaço da barra, logo e lua ficam a mesma distância
          das bordas. */}
      <style>{`html{background:${escuro ? "#03070F" : "#001433"};color-scheme:dark;scrollbar-gutter:auto}`}</style>
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
          className={`absolute -bottom-[110px] -left-[120px] h-auto w-[560px] text-white ${escuro ? "opacity-[.05]" : "opacity-[.06]"}`}
        />
      </div>

      {/* Nos cantos da tela, fora da largura máxima do conteúdo. */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-[22px]">
        <Logo className="h-7 w-auto text-white" />
        <BotaoTema className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20" />
      </header>

      <div className="relative z-10 flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
        <div className="flex flex-1 items-center justify-center pb-5 pt-14 sm:pt-12">
          <div
            className="w-full max-w-[440px] rounded-2xl bg-white px-5 py-6 text-slate-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,.55)] ring-1 ring-white/10 transition-colors sm:px-8 sm:py-8"
          >
            <div className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-5">
              <Logo className="h-8 w-auto shrink-0 text-gtf-700" />
              <div>
                <p className="text-sm font-semibold">Plataforma de Remanejamento</p>
                <p className="text-xs text-slate-500">
                  Medicina Ocupacional e Ergonomia
                </p>
              </div>
            </div>

            <FormularioLogin destino={destino} motivo={motivo} erroLink={erro} />
          </div>
        </div>

        <p className="pb-2 text-center text-xs text-white/55">© {new Date().getFullYear()} GTF · Conexão segura</p>
      </div>
    </>
  );
}
