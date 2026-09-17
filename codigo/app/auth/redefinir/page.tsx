"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase-navegador";
import Logo from "@/components/Logo";

const campo =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

/**
 * Define a senha de quem chegou por convite ou por "esqueci a senha".
 *
 * POR QUE O LINK APONTA DIRETO PRA CÁ, E NÃO PRA /auth/callback
 *
 * O convite é criado pelo admin, do servidor — não existe navegador
 * nenhum iniciando o fluxo, então o Supabase manda os tokens no
 * **fragmento** da URL (`#access_token=...`), formato antigo. Fragmento
 * de URL nunca é enviado ao servidor: é informação que só existe dentro
 * do navegador. Por isso uma rota de servidor (`/auth/callback`) nunca
 * conseguiria lê-lo — ela recebia a requisição sem nada e mandava pro
 * login, que era o bug relatado em 17/09.
 *
 * O cliente de navegador do Supabase já sabe ler esse fragmento sozinho
 * (`detectSessionInUrl`, ligado por padrão). Bastava o link cair numa
 * PÁGINA em vez de numa rota. É o que o `useEffect` abaixo aproveita:
 * instanciar o cliente aqui faz a biblioteca varrer a URL, criar a
 * sessão e gravar os cookies antes de a pessoa digitar qualquer coisa.
 *
 * Funciona igual para o formato novo (`?code=`, usado quando é o próprio
 * navegador que pede a redefinição) — a mesma inicialização trata os dois.
 * Nada disso exige SMTP próprio nem editar o template de e-mail.
 */
type EstadoSessao = "verificando" | "pronto" | "sem-sessao";

export default function PaginaRedefinir() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [estadoSessao, setEstadoSessao] = useState<EstadoSessao>("verificando");

  useEffect(() => {
    let ativo = true;

    async function prepararSessao() {
      const supabase = clienteNavegador();

      // getSession() espera a inicialização do cliente, que é quando a
      // biblioteca lê o token da URL. Sem este await, o formulário
      // apareceria antes de a sessão existir.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!ativo) return;

      if (session) {
        setEstadoSessao("pronto");
        // Tira o token da barra de endereços: já foi consumido, e link com
        // token no histórico do navegador é token vazando.
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        setEstadoSessao("sem-sessao");
      }
    }

    void prepararSessao();
    return () => {
      ativo = false;
    };
  }, []);

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
        {estadoSessao === "verificando" ? (
          <p className="py-2 text-center text-sm text-slate-400">
            Conferindo o link…
          </p>
        ) : estadoSessao === "sem-sessao" ? (
          <div className="space-y-3 text-center">
            <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
              Este link expirou ou já foi usado.
            </p>
            <p className="text-sm leading-relaxed text-slate-500">
              Peça a um administrador para enviar um convite novo, ou use
              &quot;Esqueci a senha&quot; na tela de entrada.
            </p>
            <a
              href="/login"
              className="inline-block text-sm font-medium text-gtf-700 hover:underline"
            >
              Ir para a tela de entrada
            </a>
          </div>
        ) : sucesso ? (
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
