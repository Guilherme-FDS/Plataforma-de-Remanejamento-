"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase-navegador";
import Logo from "@/components/Logo";

const campo =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

export default function PaginaRedefinir() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function definir(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      setErro("A senha precisa ter letras e números.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const supabase = clienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro(
        error.message === "New password should be different from the old password."
          ? "A nova senha deve ser diferente da atual."
          : error.message,
      );
      setEnviando(false);
      return;
    }
    setSucesso(true);
    setTimeout(() => router.replace("/"), 2000);
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center py-8">
      <div className="mb-8 text-center">
        <Logo className="mx-auto mb-5 h-12 w-auto text-gtf-700" />
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Definir senha
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha uma senha para acessar a plataforma.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {sucesso ? (
          <p className="rounded-md bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
            Senha definida com sucesso! Redirecionando…
          </p>
        ) : (
          <form onSubmit={definir} className="space-y-4">
            <div>
              <label
                htmlFor="senha"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Nova senha
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={campo}
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-400">
                Mínimo 8 caracteres, com letras e números.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmar"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Confirmar senha
              </label>
              <input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
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
              {enviando ? "Salvando…" : "Definir senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
