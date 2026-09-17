"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";
import { Cartao } from "./ui";

interface FatorTotp {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

interface Cadastro {
  factorId: string;
  qr: string;
  segredo: string;
}

/**
 * Cadastro e remoção do autenticador (TOTP) do próprio usuário.
 *
 * O QR vem pronto do Supabase como SVG em data URI — não há biblioteca de
 * QR no projeto e não precisa haver.
 *
 * Remoção exige sessão AAL2: quem entrou só com senha não consegue desligar
 * o segundo fator de ninguém, nem do próprio. É o ponto inteiro do MFA.
 */
export default function GestaoMfa({ obrigatorio }: { obrigatorio: boolean }) {
  const router = useRouter();
  const [fatores, setFatores] = useState<FatorTotp[] | null>(null);
  const [cadastro, setCadastro] = useState<Cadastro | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [verSegredo, setVerSegredo] = useState(false);

  const carregar = useCallback(async () => {
    const supabase = clienteNavegador();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setErro(error.message);
      setFatores([]);
      return;
    }
    setFatores((data?.totp ?? []) as FatorTotp[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function iniciarCadastro() {
    setErro(null);
    setOk(null);
    setOcupado(true);
    const supabase = clienteNavegador();

    // Uma tentativa anterior abandonada deixa um fator "unverified" pendurado,
    // e o Supabase recusa o enroll seguinte com "factor already exists".
    const { data: existentes } = await supabase.auth.mfa.listFactors();
    for (const f of (existentes?.all ?? []) as FatorTotp[]) {
      if (f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Autenticador · ${new Date().toLocaleDateString("pt-BR")}`,
    });

    setOcupado(false);
    if (error || !data) {
      setErro(error?.message ?? "Não foi possível iniciar o cadastro.");
      return;
    }

    setCadastro({
      factorId: data.id,
      qr: data.totp.qr_code,
      segredo: data.totp.secret,
    });
    setCodigo("");
  }

  async function confirmarCadastro(e: React.FormEvent) {
    e.preventDefault();
    if (!cadastro) return;
    setErro(null);
    setOcupado(true);

    const supabase = clienteNavegador();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: cadastro.factorId,
      code: codigo.trim(),
    });

    setOcupado(false);
    if (error) {
      setErro(
        /invalid|incorrect/i.test(error.message)
          ? "Código incorreto ou expirado. O código muda a cada 30 segundos."
          : error.message,
      );
      setCodigo("");
      return;
    }

    setCadastro(null);
    setOk("Autenticador ativado. A partir do próximo login o código será pedido.");
    await carregar();
    // A sessão virou AAL2 agora: o servidor precisa reavaliar o bloqueio.
    router.refresh();
  }

  async function cancelarCadastro() {
    if (!cadastro) return;
    const supabase = clienteNavegador();
    await supabase.auth.mfa.unenroll({ factorId: cadastro.factorId });
    setCadastro(null);
    setCodigo("");
    setErro(null);
  }

  async function remover(id: string) {
    // Um clique acidental aqui apaga a única proteção da conta — foi
    // exatamente assim que a verificação em duas etapas parou de funcionar
    // numa conta real, sem que ninguém tivesse religado depois.
    const confirmado = window.confirm(
      ativos.length <= 1
        ? "Remover o autenticador tira a verificação em duas etapas desta conta. Se a plataforma exigir o segundo fator, você fica sem acesso ao dado clínico até cadastrar outro. Confirma?"
        : "Remover este autenticador?",
    );
    if (!confirmado) return;

    setErro(null);
    setOk(null);
    setOcupado(true);
    const supabase = clienteNavegador();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setOcupado(false);
    if (error) {
      setErro(
        /aal2|assurance/i.test(error.message)
          ? "Para remover o autenticador é preciso ter entrado com o código nesta sessão. Saia e entre de novo."
          : error.message,
      );
      return;
    }
    setOk("Autenticador removido.");
    await carregar();
    router.refresh();
  }

  const ativos = (fatores ?? []).filter((f) => f.status === "verified");

  return (
    <Cartao
      titulo="Verificação em duas etapas"
      descricao="Senha + código de 6 dígitos gerado no celular. Sem isso, uma senha vazada dá acesso a todo o histórico clínico."
    >
      <div className="space-y-4 px-5 py-4">
        {ok && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
            {ok}
          </p>
        )}
        {erro && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
            {erro}
          </p>
        )}

        {fatores === null && (
          <p className="text-sm text-slate-400">Carregando…</p>
        )}

        {/* ---------------------------------------------- cadastro em curso */}
        {cadastro && (
          <div className="space-y-4">
            <ol className="space-y-1.5 text-sm text-slate-600">
              <li>
                <strong className="font-medium text-slate-900">1.</strong>{" "}
                Use um aplicativo autenticador — Google Authenticator,
                Microsoft Authenticator ou similar. O gerenciador de senhas
                do próprio celular também serve: no iPhone, Ajustes →
                Senhas → esta conta → &quot;Configurar Código de
                Verificação&quot; → &quot;Ler Código QR&quot;.
              </li>
              <li>
                <strong className="font-medium text-slate-900">2.</strong>{" "}
                Leia o QR abaixo com esse aplicativo.
              </li>
              <li>
                <strong className="font-medium text-slate-900">3.</strong>{" "}
                Digite o código de 6 dígitos que ele mostrar.
              </li>
            </ol>

            <div className="flex justify-center rounded-lg border border-slate-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cadastro.qr}
                alt="QR code para cadastrar o autenticador"
                className="h-48 w-48"
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setVerSegredo((v) => !v)}
                className="text-xs text-slate-400 underline hover:text-slate-700"
              >
                {verSegredo
                  ? "Ocultar código manual"
                  : "Não consigo ler o QR — mostrar código manual"}
              </button>
              {verSegredo && (
                <p className="mt-2 select-all break-all rounded bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                  {cadastro.segredo}
                </p>
              )}
            </div>

            <form onSubmit={confirmarCadastro} className="space-y-3">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-center text-lg font-semibold tracking-[0.4em] text-slate-900 placeholder:font-normal placeholder:text-slate-300 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelarCadastro}
                  className="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={ocupado || codigo.length < 6}
                  className="h-11 flex-1 rounded-lg bg-gtf-700 text-sm font-medium text-white transition hover:bg-gtf-800 disabled:bg-slate-300"
                >
                  {ocupado ? "Conferindo…" : "Ativar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------- já tem fator(es) */}
        {!cadastro && ativos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              <span aria-hidden>✓</span>
              Verificação em duas etapas ativa nesta conta.
            </div>
            <ul className="divide-y divide-slate-100">
              {ativos.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">
                      {f.friendly_name || "Autenticador"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Ativado em{" "}
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => remover(f.id)}
                    disabled={ocupado}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            {obrigatorio && (
              <p className="text-xs leading-relaxed text-amber-700">
                A plataforma exige verificação em duas etapas. Se você remover o
                autenticador, perde o acesso aos dados até cadastrar outro.
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------ sem fator */}
        {!cadastro && fatores !== null && ativos.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Esta conta ainda não tem verificação em duas etapas.
              {obrigatorio
                ? " Ela é obrigatória: sem cadastrar, os dados clínicos não aparecem."
                : " Leva um minuto e é o que protege o dado de saúde caso a senha vaze."}
            </p>
            <button
              onClick={iniciarCadastro}
              disabled={ocupado}
              className="h-11 w-full rounded-lg bg-gtf-700 text-sm font-medium text-white transition hover:bg-gtf-800 disabled:bg-slate-300 sm:w-auto sm:px-5"
            >
              {ocupado ? "Preparando…" : "Ativar verificação em duas etapas"}
            </button>
          </div>
        )}
      </div>
    </Cartao>
  );
}
