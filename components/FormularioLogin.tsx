"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";

export default function FormularioLogin({ destino }: { destino: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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

    router.replace(destino);
    router.refresh();
  }

  const campo =
    "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

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

      <p className="pt-2 text-center text-xs leading-relaxed text-slate-500">
        Acesso restrito à equipe de medicina ocupacional e ergonomia. Não há
        auto-cadastro: o acesso é criado por um administrador.
      </p>
    </form>
  );
}
