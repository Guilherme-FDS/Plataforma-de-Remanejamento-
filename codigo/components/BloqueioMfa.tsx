"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import DesafioMfa from "./DesafioMfa";

/**
 * Tela que substitui o conteúdo quando a sessão não satisfaz o MFA.
 *
 * Não é segurança — a RLS já devolveu vazio antes de chegar aqui. É
 * explicação: sem isto a pessoa vê um painel zerado e conclui que o sistema
 * perdeu os dados.
 */
export default function BloqueioMfa({
  precisaConfirmar,
}: {
  /** true = tem autenticador e falta digitar o código; false = falta cadastrar. */
  precisaConfirmar: boolean;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
      <span
        className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" />
        </svg>
      </span>

      {precisaConfirmar ? (
        <>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            Confirme o código do autenticador
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Esta sessão foi aberta só com a senha. Os dados clínicos só
            aparecem depois da segunda etapa.
          </p>
          <div className="mt-6 w-full text-left">
            <DesafioMfa aoConfirmar={() => router.refresh()} compacto />
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            Cadastre a verificação em duas etapas
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            A plataforma passou a exigir um segundo fator para abrir dado de
            saúde. Leva cerca de um minuto e usa um aplicativo autenticador no
            seu celular.
          </p>
          <Link
            href="/seguranca"
            className="mt-6 h-11 rounded-lg bg-gtf-700 px-5 text-sm font-medium leading-[2.75rem] text-white transition hover:bg-gtf-800"
          >
            Cadastrar agora
          </Link>
        </>
      )}
    </div>
  );
}
