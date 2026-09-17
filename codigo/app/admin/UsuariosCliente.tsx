"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui";
import LinkConvite from "@/components/LinkConvite";
import type { ResultadoCriacao, UsuarioAdmin } from "@/app/actions/usuarios";
import type { AlcanceUnidades, Papel, Unidade } from "@/lib/tipos";
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

const PAPEIS: { v: Papel; r: string; descricao: string }[] = [
  { v: "visualizador", r: "Visualizador", descricao: "só consulta e exporta relatórios" },
  { v: "lancador", r: "Lançador", descricao: "cria e edita casos, não exclui" },
  { v: "operador", r: "Operador", descricao: "cria, edita e exclui casos" },
];

const ALCANCES: { v: AlcanceUnidades; r: string; descricao: string }[] = [
  { v: "propria", r: "Só a própria unidade", descricao: "vê apenas a unidade dele" },
  { v: "todas", r: "Todas as unidades", descricao: "gestor — enxerga tudo" },
  { v: "especificas", r: "Unidades específicas", descricao: "a própria + as que você liberar" },
];

const campo =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

function funcaoRotulo(f: string | null) {
  return FUNCOES.find((x) => x.v === f)?.r ?? f ?? "—";
}
function papelRotulo(p: Papel) {
  return PAPEIS.find((x) => x.v === p)?.r ?? p;
}
function alcanceRotulo(a: AlcanceUnidades) {
  return ALCANCES.find((x) => x.v === a)?.r ?? a;
}

export default function UsuariosCliente({
  usuarios,
  unidades,
}: {
  usuarios: UsuarioAdmin[];
  unidades: Unidade[];
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  // Link de definição de senha do último usuário criado / último reenvio.
  // Fica visível até o admin fechar, para dar tempo de copiar.
  const [convite, setConvite] = useState<{
    link: string;
    emailEnviado: boolean;
    nome: string;
  } | null>(null);

  function atualizarPagina() {
    router.refresh();
  }

  const usuarioDetalhe = usuarios.find((u) => u.id === detalheId) ?? null;

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
        <FormUsuario
          unidades={unidades}
          onSalvar={async (dados) => {
            const res = await criarUsuario(dados);
            if (res.ok) {
              setCriando(false);
              if (res.link) {
                setConvite({
                  link: res.link,
                  emailEnviado: res.emailEnviado ?? true,
                  nome: dados.nome,
                });
              }
              atualizarPagina();
            }
            return res;
          }}
          onCancelar={() => setCriando(false)}
        />
      )}

      {/* Link para repassar por outro canal — some quando o admin fecha */}
      {convite && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              Link de acesso · {convite.nome}
            </p>
            <button
              onClick={() => setConvite(null)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Fechar
            </button>
          </div>
          <LinkConvite
            link={convite.link}
            emailEnviado={convite.emailEnviado}
          />
        </div>
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
            <div key={u.id} className="bg-slate-50 px-5 py-4">
              <FormUsuario
                unidades={unidades}
                usuario={u}
                onSalvar={async (dados) => {
                  const res = await editarUsuario(u.id, dados);
                  if (res.ok) { setEditandoId(null); atualizarPagina(); }
                  return res;
                }}
                onCancelar={() => setEditandoId(null)}
              />
            </div>
          ) : (
            <LinhaUsuario
              key={u.id}
              usuario={u}
              onVerDetalhe={() => setDetalheId(u.id)}
              onEditar={() => setEditandoId(u.id)}
              onToggle={async () => {
                await toggleUsuario(u.id, !u.ativo);
                atualizarPagina();
              }}
              onEnviarLink={async () => {
                const res = await enviarLinkRedefinicao(u.email);
                if (res.ok && res.link) {
                  setConvite({
                    link: res.link,
                    emailEnviado: res.emailEnviado ?? true,
                    nome: u.nome,
                  });
                }
                return res;
              }}
            />
          ),
        )}
      </div>

      {/* Modal de informações básicas */}
      {usuarioDetalhe && (
        <Modal titulo="Dados do usuário" onFechar={() => setDetalheId(null)}>
          <DetalheUsuario usuario={usuarioDetalhe} unidades={unidades} />
        </Modal>
      )}
    </div>
  );
}

// ─── Modal de detalhe (informações básicas) ─────────────────────────────────

function DetalheUsuario({
  usuario: u,
  unidades,
}: {
  usuario: UsuarioAdmin;
  unidades: Unidade[];
}) {
  const nomesExtra = u.unidadesExtra
    .map((id) => unidades.find((un) => un.id === id)?.nome)
    .filter(Boolean);

  return (
    <dl className="space-y-3 text-sm">
      <Campo rotulo="Nome completo" valor={u.nome} />
      <Campo rotulo="E-mail" valor={u.email} />
      <Campo rotulo="Função" valor={funcaoRotulo(u.funcao)} />
      <Campo rotulo="Papel" valor={papelRotulo(u.papel)} />
      <Campo rotulo="Administrador" valor={u.admin ? "Sim" : "Não"} />
      <Campo rotulo="Status" valor={u.ativo ? "Ativo" : "Inativo"} />
      <Campo rotulo="Unidade" valor={u.unidadeNome ?? "—"} />
      <Campo rotulo="Alcance de unidades" valor={alcanceRotulo(u.alcanceUnidades)} />
      {u.alcanceUnidades === "especificas" && (
        <Campo
          rotulo="Unidades extras liberadas"
          valor={nomesExtra.length > 0 ? nomesExtra.join(", ") : "Nenhuma"}
        />
      )}
      <Campo
        rotulo="Convite"
        valor={u.confirmado ? "Aceito" : "Pendente"}
      />
      <Campo
        rotulo="Último acesso"
        valor={
          u.ultimoLogin
            ? new Date(u.ultimoLogin).toLocaleString("pt-BR")
            : "Nunca acessou"
        }
      />
    </dl>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor}</dd>
    </div>
  );
}

// ─── Linha de usuário ────────────────────────────────────────────────────────

function LinhaUsuario({
  usuario: u,
  onVerDetalhe,
  onEditar,
  onToggle,
  onEnviarLink,
}: {
  usuario: UsuarioAdmin;
  onVerDetalhe: () => void;
  onEditar: () => void;
  onToggle: () => Promise<void>;
  onEnviarLink: () => Promise<ResultadoCriacao>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div className={`px-5 py-3 ${!u.ativo ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          onClick={onVerDetalhe}
          className="min-w-0 flex-1 text-left"
          title="Ver informações completas"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900 text-sm hover:underline">
              {u.nome}
            </span>
            {u.admin && (
              <span className="rounded bg-gtf-100 px-1.5 py-0.5 text-[10px] font-semibold text-gtf-800 uppercase tracking-wide">
                Admin
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                u.papel === "visualizador"
                  ? "bg-violet-50 text-violet-700"
                  : u.papel === "lancador"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-sky-50 text-sky-700"
              }`}
            >
              {papelRotulo(u.papel)}
            </span>
            {u.alcanceUnidades !== "propria" && (
              <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 uppercase tracking-wide">
                {alcanceRotulo(u.alcanceUnidades)}
              </span>
            )}
            {!u.ativo && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 uppercase">
                Inativo
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {u.email} · {funcaoRotulo(u.funcao)} · {u.unidadeNome ?? "sem unidade"}
            {u.ultimoLogin && (
              <> · último acesso {new Date(u.ultimoLogin).toLocaleDateString("pt-BR")}</>
            )}
            {!u.confirmado && <> · <span className="text-amber-600">convite pendente</span></>}
          </p>
        </button>

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

// ─── Formulário (criar e editar) ────────────────────────────────────────────

interface DadosUsuarioForm {
  email: string;
  nome: string;
  funcao: string;
  papel: Papel;
  admin: boolean;
  unidadeId: number;
  alcanceUnidades: AlcanceUnidades;
  unidadesExtras: number[];
}

function FormUsuario({
  usuario,
  unidades,
  onSalvar,
  onCancelar,
}: {
  usuario?: UsuarioAdmin;
  unidades: Unidade[];
  onSalvar: (dados: DadosUsuarioForm) => Promise<{ ok: boolean; erro?: string }>;
  onCancelar: () => void;
}) {
  const ehEdicao = !!usuario;
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [funcao, setFuncao] = useState(usuario?.funcao ?? "");
  const [papel, setPapel] = useState<Papel>(usuario?.papel ?? "operador");
  const [admin, setAdmin] = useState(usuario?.admin ?? false);
  const [unidadeId, setUnidadeId] = useState(
    usuario?.unidadeId ?? unidades[0]?.id ?? 0,
  );
  const [alcanceUnidades, setAlcanceUnidades] = useState<AlcanceUnidades>(
    usuario?.alcanceUnidades ?? "propria",
  );
  const [unidadesExtras, setUnidadesExtras] = useState<number[]>(
    usuario?.unidadesExtra ?? [],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleExtra(id: number) {
    setUnidadesExtras((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !funcao || !unidadeId) return;
    if (!ehEdicao && !email) return;
    setErro(null);
    startTransition(async () => {
      const res = await onSalvar({
        email,
        nome,
        funcao,
        papel,
        admin,
        unidadeId,
        alcanceUnidades,
        unidadesExtras,
      });
      if (!res.ok) setErro(res.erro ?? "Erro ao salvar.");
    });
  }

  return (
    <div className={ehEdicao ? "" : "rounded-xl border border-gtf-200 bg-gtf-50 p-5"}>
      {!ehEdicao && (
        <>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Novo usuário</h3>
          <p className="mb-4 text-xs text-slate-500">
            O usuário receberá um e-mail de convite para definir a senha e acessar a plataforma.
          </p>
        </>
      )}
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
              autoFocus={!ehEdicao}
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
              required={!ehEdicao}
              disabled={ehEdicao}
              placeholder="maria@gtf.com"
              className={`${campo} disabled:bg-slate-100 disabled:text-slate-400`}
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
              onChange={(e) => setPapel(e.target.value as Papel)}
              className={campo}
            >
              {PAPEIS.map((p) => (
                <option key={p.v} value={p.v}>{p.r} — {p.descricao}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Unidade
            </label>
            <select
              value={unidadeId}
              onChange={(e) => setUnidadeId(Number(e.target.value))}
              required
              className={campo}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Alcance de unidades
            </label>
            <select
              value={alcanceUnidades}
              onChange={(e) => setAlcanceUnidades(e.target.value as AlcanceUnidades)}
              className={campo}
            >
              {ALCANCES.map((a) => (
                <option key={a.v} value={a.v}>{a.r} — {a.descricao}</option>
              ))}
            </select>
          </div>
        </div>

        {alcanceUnidades === "especificas" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Unidades extras liberadas (além da unidade acima)
            </label>
            <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
              {unidades.filter((u) => u.id !== unidadeId).length === 0 && (
                <p className="text-xs text-slate-400">Não há outras unidades cadastradas.</p>
              )}
              {unidades
                .filter((u) => u.id !== unidadeId)
                .map((u) => (
                  <label key={u.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={unidadesExtras.includes(u.id)}
                      onChange={() => toggleExtra(u.id)}
                      className="h-4 w-4 rounded border-slate-300 text-gtf-700 focus:ring-gtf-600"
                    />
                    {u.nome}
                  </label>
                ))}
            </div>
          </div>
        )}

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
            disabled={!nome || !funcao || !unidadeId || (!ehEdicao && !email) || pending}
            className="rounded-md bg-gtf-700 px-4 py-2 text-sm font-medium text-white hover:bg-gtf-800 disabled:bg-slate-300"
          >
            {pending
              ? "Salvando…"
              : ehEdicao
                ? "Salvar"
                : "Criar e enviar convite"}
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
