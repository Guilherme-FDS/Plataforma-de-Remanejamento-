"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";
import DesafioMfa from "./DesafioMfa";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function FormularioLogin({
  destino,
  motivo,
  erroLink,
  escuro = false,
}: {
  destino: string;
  /** "inatividade" quando o logout automático trouxe a pessoa para cá. */
  motivo?: string;
  /** "link-invalido" quando um convite/redefinição expirou. */
  erroLink?: string;
  escuro?: boolean;
}) {
  const router = useRouter();
  // Aviso de inatividade só aparece se o logout automático mandou para cá;
  // some ao fechar ou ao começar a digitar.
  const [avisoInatividade, setAvisoInatividade] = useState(motivo === "inatividade");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedeCodigo, setPedeCodigo] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
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

  const c = (claro: string, noEscuro: string) => (escuro ? noEscuro : claro);
  const campo = `h-12 w-full rounded-[10px] border pl-11 pr-11 text-[15px] transition focus:outline-none focus:ring-4 ${c(
    "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:ring-gtf-600/15",
    "border-[#22304A] bg-[#0E1626] text-slate-100 placeholder:text-slate-500 focus:border-gtf-400 focus:ring-gtf-400/20",
  )}`;
  const rotulo = "mb-1.5 block text-[13px] font-semibold";
  const icone = `pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${c("text-slate-400", "text-slate-500")}`;
  const link = `text-[13px] font-semibold hover:underline ${c("text-gtf-600", "text-gtf-300")}`;
  const botao =
    "flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-gtf-700 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,53,142,.55)] transition hover:bg-gtf-800 active:translate-y-px disabled:cursor-wait disabled:opacity-75";
  const sub = c("text-slate-500", "text-slate-400");

  const Titulo = ({ olho, titulo, texto }: { olho: string; titulo: string; texto: string }) => (
    <div className="mb-6">
      <p className={`flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[.12em] ${c("text-gtf-600", "text-gtf-300")}`}>
        <span className="h-1.5 w-1.5 rounded-sm bg-current" />
        {olho}
      </p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight">{titulo}</h1>
      <p className={`mt-1.5 text-sm ${sub}`}>{texto}</p>
    </div>
  );

  const Girando = () => (
    <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white" />
  );

  const IconeEmail = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icone} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );

  const alertaErro = "rounded-[10px] border px-3 py-2.5 text-sm " + c(
    "border-rose-200 bg-rose-50 text-rose-700",
    "border-rose-900/60 bg-rose-950/40 text-rose-300",
  );

  if (pedeCodigo) {
    return (
      <div>
        <Titulo
          olho="Verificação em duas etapas"
          titulo="Confirme o código"
          texto="Senha conferida. Abra o aplicativo autenticador e digite o código de 6 dígitos."
        />
        <DesafioMfa aoConfirmar={concluir} />
        <button
          type="button"
          onClick={async () => {
            await clienteNavegador().auth.signOut();
            setPedeCodigo(false);
            setSenha("");
          }}
          className={`mt-4 block w-full text-center ${link}`}
        >
          ← Entrar com outra conta
        </button>
      </div>
    );
  }

  if (mostraEsqueci) {
    return (
      <div>
        <Titulo
          olho="Recuperar acesso"
          titulo="Redefinir senha"
          texto="Informe seu e-mail e enviaremos um link para você definir uma nova senha."
        />
        <form onSubmit={solicitarReset} className="space-y-4">
          <div>
            <label htmlFor="email-reset" className={rotulo}>
              E-mail
            </label>
            <div className="relative">
              <IconeEmail />
              <input
                id="email-reset"
                type="email"
                required
                autoFocus
                placeholder="nome@gtf.com.br"
                value={emailReset}
                onChange={(e) => setEmailReset(e.target.value)}
                className={campo}
              />
            </div>
          </div>
          {feedbackReset && (
            <p
              className={
                feedbackReset.ok
                  ? "rounded-[10px] border px-3 py-2.5 text-sm " +
                    c("border-emerald-200 bg-emerald-50 text-emerald-800", "border-emerald-900/60 bg-emerald-950/40 text-emerald-300")
                  : alertaErro
              }
            >
              {feedbackReset.msg}
            </p>
          )}
          <button type="submit" disabled={enviandoReset || !!feedbackReset?.ok} className={botao}>
            {enviandoReset ? (
              <>
                <Girando /> Enviando…
              </>
            ) : (
              "Enviar link"
            )}
          </button>
        </form>
        <button
          type="button"
          onClick={() => { setMostraEsqueci(false); setFeedbackReset(null); }}
          className={`mt-5 block w-full text-center ${link}`}
        >
          ← Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div>
      <Titulo
        olho="Acesso restrito"
        titulo="Bem-vindo de volta"
        texto="Entre com seu e-mail e senha para acessar a plataforma."
      />

      {avisoInatividade && (
        <div
          role="status"
          className={`mb-5 flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm ${c(
            "border-amber-300 bg-amber-50 text-amber-800",
            "border-amber-900/60 bg-amber-950/40 text-amber-300",
          )}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span className="flex-1">Sessão encerrada por 15 minutos sem uso. Entre de novo.</span>
          <button
            type="button"
            onClick={() => setAvisoInatividade(false)}
            aria-label="Fechar aviso"
            className="px-0.5 leading-none opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {erroLink === "link-invalido" && (
        <p className={`mb-5 ${alertaErro}`}>
          Este link expirou ou já foi usado. Peça um novo convite ou link de
          redefinição de senha.
        </p>
      )}

      <form onSubmit={entrar} className="space-y-4">
        <div>
          <label htmlFor="email" className={rotulo}>
            E-mail
          </label>
          <div className="relative">
            <IconeEmail />
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              placeholder="nome@gtf.com.br"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAvisoInatividade(false); }}
              className={campo}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label htmlFor="senha" className={rotulo}>
            Senha
          </label>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icone} aria-hidden>
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="senha"
              type={verSenha ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setAvisoInatividade(false); }}
              className={campo}
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={verSenha}
              className={`absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg transition ${
                verSenha
                  ? c("bg-gtf-50 text-gtf-600", "bg-white/10 text-gtf-300")
                  : c("text-slate-400 hover:bg-slate-100 hover:text-slate-700", "text-slate-500 hover:bg-white/10 hover:text-slate-200")
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                {verSenha && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => setMostraEsqueci(true)} className={link}>
              Esqueci a senha
            </button>
          </div>
        </div>

        {erro && <p className={alertaErro}>{erro}</p>}

        <button type="submit" disabled={enviando} className={botao}>
          {enviando ? (
            <>
              <Girando /> Entrando…
            </>
          ) : (
            <>
              Entrar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div
        className={`mt-6 flex items-start gap-2.5 rounded-[10px] border border-dashed px-3.5 py-3 text-[12.5px] leading-relaxed ${c(
          "border-slate-200 text-slate-500",
          "border-[#22304A] text-slate-400",
        )}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`mt-0.5 h-4 w-4 shrink-0 ${c("text-gtf-600", "text-gtf-300")}`} aria-hidden>
          <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
        </svg>
        <span>
          Acesso exclusivo da equipe de medicina ocupacional e ergonomia. Não há
          auto-cadastro: o acesso é criado por um administrador.
        </span>
      </div>
    </div>
  );
}
