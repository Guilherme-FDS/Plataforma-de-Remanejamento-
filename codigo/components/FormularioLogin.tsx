"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";
import DesafioMfa from "./DesafioMfa";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function FormularioLogin({ destino }: { destino: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedeCodigo, setPedeCodigo] = useState(false);
  const [mostraEsqueci, setMostraEsqueci] = useState(false);
  const [emailReset, setEmailReset] = useState("");
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [feedbackReset, setFeedbackReset] = useState<{ ok: boolean; msg: string } | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      );
      setEnviando(false);
      return;
    }

    // A senha só entrega AAL1. Se a conta tem autenticador cadastrado,
    // `nextLevel` vem como "aal2" e a sessão ainda não vale para ler dado
    // clínico — a RLS (migration 0012) recusa. Pede o código antes de sair
    // da tela, em vez de deixar o usuário cair num painel vazio.
    const { data: nivel } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (nivel?.nextLevel === "aal2" && nivel.currentLevel !== "aal2") {
      setPedeCodigo(true);
      setEnviando(false);
      return;
    }

    router.replace(destino);
    router.refresh();
  }

  function concluir() {
    router.replace(destino);
    router.refresh();
  }

  async function solicitarReset(e: React.FormEvent) {
    e.preventDefault();
    setEnviandoReset(true);
    setFeedbackReset(null);
    const supabase = clienteNavegador();
    // Direto na página, não em /auth/callback: a mesma página trata tanto o
    // formato deste fluxo (`?code=`, iniciado pelo navegador) quanto o do
    // convite feito pelo admin (`#access_token=`). Ver o comentário no topo
    // de app/auth/redefinir/page.tsx.
    const { error } = await supabase.auth.resetPasswordForEmail(emailReset.trim(), {
      redirectTo: `${SITE_URL}/auth/redefinir`,
    });
    setEnviandoReset(false);
    setFeedbackReset(
      error
        ? { ok: false, msg: error.message }
        : { ok: true, msg: "Link enviado! Verifique seu e-mail." },
    );
  }

  const campo =
    "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

  if (pedeCodigo) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Senha conferida. Agora abra o aplicativo autenticador e digite o
          código de 6 dígitos.
        </p>
        <DesafioMfa aoConfirmar={concluir} />
        <button
          type="button"
          onClick={async () => {
            await clienteNavegador().auth.signOut();
            setPedeCodigo(false);
            setSenha("");
          }}
          className="block w-full text-center text-xs text-slate-400 hover:text-slate-700"
        >
          ← Entrar com outra conta
        </button>
      </div>
    );
  }

  if (mostraEsqueci) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Informe seu e-mail e enviaremos um link para você definir uma nova senha.
        </p>
        <form onSubmit={solicitarReset} className="space-y-3">
          <input
            type="email"
            required
            autoFocus
            placeholder="seu@email.com"
            value={emailReset}
            onChange={(e) => setEmailReset(e.target.value)}
            className={campo}
          />
          {feedbackReset && (
            <p
              className={`rounded-md px-3 py-2 text-sm ring-1 ring-inset ${
                feedbackReset.ok
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                  : "bg-rose-50 text-rose-700 ring-rose-600/20"
              }`}
            >
              {feedbackReset.msg}
            </p>
          )}
          <button
            type="submit"
            disabled={enviandoReset || !!feedbackReset?.ok}
            className="h-11 w-full rounded-lg bg-gtf-700 text-sm font-medium text-white transition hover:bg-gtf-800 disabled:bg-slate-300"
          >
            {enviandoReset ? "Enviando…" : "Enviar link"}
          </button>
        </form>
        <button
          onClick={() => { setMostraEsqueci(false); setFeedbackReset(null); }}
          className="block w-full text-center text-xs text-slate-400 hover:text-slate-700"
        >
          ← Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={campo}
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="senha"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={campo}
        />
      </div>

      {erro && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-11 w-full rounded-lg bg-gtf-700 text-sm font-medium text-white transition hover:bg-gtf-800 active:bg-gtf-900 disabled:bg-slate-300"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>

      <button
        type="button"
        onClick={() => setMostraEsqueci(true)}
        className="block w-full text-center text-xs text-slate-400 hover:text-gtf-700"
      >
        Esqueci a senha
      </button>

      <p className="pt-1 text-center text-xs leading-relaxed text-slate-500">
        Acesso restrito à equipe de medicina ocupacional e ergonomia. Não há
        auto-cadastro: o acesso é criado por um administrador.
      </p>
    </form>
  );
}
