"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UsuarioAdmin } from "@/app/actions/usuarios";
import {
  criarUsuario,
  editarUsuario,
  toggleUsuario,
  enviarLinkRedefinicao,
} from "@/app/actions/usuarios";

const FUNCOES = [
  { v: "medico", r: "Médico(a)" },
  { v: "enfermeiro", r: "Enfermeiro(a)" },
  { v: "ergonomista", r: "Ergonomista" },
  { v: "tecnico_seguranca", r: "Técnico(a) de Segurança" },
];

const campo =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

export default function UsuariosCliente({
  usuarios,
}: {
  usuarios: UsuarioAdmin[];
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function atualizarPagina() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""}
        </p>
        {!criando && (
          <button
            onClick={() => setCriando(true)}
            className="rounded-md bg-gtf-700 px-4 py-2 text-sm font-medium text-white hover:bg-gtf-800"
          >
            + Novo usuário
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {criando && (
        <FormNovoUsuario
          onSalvar={async (dados) => {
            const res = await criarUsuario(dados);
            if (res.ok) { setCriando(false); atualizarPagina(); }
            return res;
          }}
          onCancelar={() => setCriando(false)}
        />
      )}

      {/* Lista */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {usuarios.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Nenhum usuário cadastrado.
          </p>
        )}
        {usuarios.map((u) =>
          editandoId === u.id ? (
            <FormEditarUsuario
              key={u.id}
              usuario={u}
              onSalvar={async (dados) => {
                const res = await editarUsuario(u.id, dados);
                if (res.ok) { setEditandoId(null); atualizarPagina(); }
                return res;
              }}
              onCancelar={() => setEditandoId(null)}
            />
          ) : (
            <LinhaUsuario
              key={u.id}
              usuario={u}
              onEditar={() => setEditandoId(u.id)}
              onToggle={async () => {
                await toggleUsuario(u.id, !u.ativo);
                atualizarPagina();
              }}
              onEnviarLink={async () => {
                const res = await enviarLinkRedefinicao(u.email);
                return res;
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}

// ─── Linha de usuário ────────────────────────────────────────────────────────

function LinhaUsuario({
  usuario: u,
  onEditar,
  onToggle,
  onEnviarLink,
}: {
  usuario: UsuarioAdmin;
  onEditar: () => void;
  onToggle: () => Promise<void>;
  onEnviarLink: () => Promise<{ ok: boolean; erro?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function funcaoRotulo(f: string | null) {
    return FUNCOES.find((x) => x.v === f)?.r ?? f ?? "—";
  }

  return (
    <div className={`px-5 py-3 ${!u.ativo ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900 text-sm">{u.nome}</span>
            {u.admin && (
              <span className="rounded bg-gtf-100 px-1.5 py-0.5 text-[10px] font-semibold text-gtf-800 uppercase tracking-wide">
                Admin
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                u.papel === "visualizador"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-sky-50 text-sky-700"
              }`}
            >
              {u.papel}
            </span>
            {!u.ativo && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 uppercase">
                Inativo
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {u.email} · {funcaoRotulo(u.funcao)}
            {u.ultimoLogin && (
              <> · último acesso {new Date(u.ultimoLogin).toLocaleDateString("pt-BR")}</>
            )}
            {!u.confirmado && <> · <span className="text-amber-600">convite pendente</span></>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onEditar}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Editar
          </button>
          <button
            onClick={() =>
              startTransition(async () => {
                const res = await onEnviarLink();
                setFeedback(res.ok ? "Link enviado!" : (res.erro ?? "Erro."));
                setTimeout(() => setFeedback(null), 3000);
              })
            }
            disabled={pending}
            className="text-xs text-slate-500 hover:text-gtf-700 disabled:opacity-40"
          >
            Reenviar link
          </button>
          <button
            onClick={() => startTransition(onToggle)}
            disabled={pending}
            className={`text-xs disabled:opacity-40 ${
              u.ativo
                ? "text-slate-400 hover:text-rose-600"
                : "text-emerald-600 hover:underline"
            }`}
          >
            {u.ativo ? "Desativar" : "Reativar"}
          </button>
        </div>
      </div>
      {feedback && (
        <p className="mt-1 text-xs text-gtf-700">{feedback}</p>
      )}
    </div>
  );
}

// ─── Formulário de criação ───────────────────────────────────────────────────

function FormNovoUsuario({
  onSalvar,
  onCancelar,
}: {
  onSalvar: (dados: {
    email: string;
    nome: string;
    funcao: string;
    papel: "operador" | "visualizador";
    admin: boolean;
  }) => Promise<{ ok: boolean; erro?: string }>;
  onCancelar: () => void;
}) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [papel, setPapel] = useState<"operador" | "visualizador">("operador");
  const [admin, setAdmin] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !nome || !funcao) return;
    setErro(null);
    startTransition(async () => {
      const res = await onSalvar({ email, nome, funcao, papel, admin });
      if (!res.ok) setErro(res.erro ?? "Erro ao criar.");
    });
  }

  return (
    <div className="rounded-xl border border-gtf-200 bg-gtf-50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Novo usuário</h3>
      <p className="mb-4 text-xs text-slate-500">
        O usuário receberá um e-mail de convite para definir a senha e acessar a plataforma.
      </p>
      <form onSubmit={enviar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Nome completo
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Maria da Silva"
              className={campo}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="maria@gtf.com"
              className={campo}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Função
            </label>
            <select
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              required
              className={campo}
            >
              <option value="">Selecione…</option>
              {FUNCOES.map((f) => (
                <option key={f.v} value={f.v}>{f.r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Papel
            </label>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as "operador" | "visualizador")}
              className={campo}
            >
              <option value="operador">Operador — acesso completo</option>
              <option value="visualizador">Visualizador — só leitura e relatórios</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={admin}
            onChange={(e) => setAdmin(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-gtf-700 focus:ring-gtf-600"
          />
          Administrador (pode criar e gerenciar outros usuários)
        </label>

        {erro && (
          <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-600/20">
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!email || !nome || !funcao || pending}
            className="rounded-md bg-gtf-700 px-4 py-2 text-sm font-medium text-white hover:bg-gtf-800 disabled:bg-slate-300"
          >
            {pending ? "Enviando convite…" : "Criar e enviar convite"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Formulário de edição ────────────────────────────────────────────────────

function FormEditarUsuario({
  usuario: u,
  onSalvar,
  onCancelar,
}: {
  usuario: UsuarioAdmin;
  onSalvar: (dados: {
    nome: string;
    funcao: string;
    papel: string;
    admin: boolean;
  }) => Promise<{ ok: boolean; erro?: string }>;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(u.nome);
  const [funcao, setFuncao] = useState(u.funcao ?? "");
  const [papel, setPapel] = useState(u.papel);
  const [admin, setAdmin] = useState(u.admin);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const res = await onSalvar({ nome, funcao, papel, admin });
      if (!res.ok) setErro(res.erro ?? "Erro.");
    });
  }

  return (
    <div className="bg-slate-50 px-5 py-4">
      <p className="mb-3 text-xs text-slate-500">{u.email}</p>
      <form onSubmit={enviar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required className={campo} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Função</label>
            <select value={funcao} onChange={(e) => setFuncao(e.target.value)} className={campo}>
              <option value="">—</option>
              {FUNCOES.map((f) => <option key={f.v} value={f.v}>{f.r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Papel</label>
            <select value={papel} onChange={(e) => setPapel(e.target.value)} className={campo}>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-gtf-700 focus:ring-gtf-600" />
          Administrador
        </label>
        {erro && <p className="text-xs text-rose-600">{erro}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-gtf-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-gtf-800 disabled:bg-slate-300">
            {pending ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={onCancelar} className="rounded-md px-4 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
