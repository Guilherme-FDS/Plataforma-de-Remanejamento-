"use client";

import { useState, useTransition } from "react";
import type { ItemLista, ListasAdmin, SegmentoAdmin } from "@/lib/dados";
import {
  criarSetor, editarSetor, toggleSetor,
  criarTurno, editarTurno,
  criarSupervisor, editarSupervisor, toggleSupervisor,
  criarProfissional, editarProfissional, toggleProfissional,
  criarRegiao, editarRegiao,
  criarSegmento, editarSegmento, toggleSegmento,
} from "@/app/actions/admin";

type Aba = "setores" | "turnos" | "supervisores" | "profissionais" | "segmentos" | "regioes";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "setores", rotulo: "Setores" },
  { id: "turnos", rotulo: "Turnos" },
  { id: "supervisores", rotulo: "Supervisores" },
  { id: "profissionais", rotulo: "Profissionais" },
  { id: "segmentos", rotulo: "Segmentos" },
  { id: "regioes", rotulo: "Regiões" },
];

export default function AdminCliente({ listas }: { listas: ListasAdmin }) {
  const [aba, setAba] = useState<Aba>("setores");

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              aba === a.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "setores" && (
        <ListaSimples
          titulo="Setores"
          itens={listas.setores}
          temAtivo
          onCriar={criarSetor}
          onEditar={editarSetor}
          onToggle={toggleSetor}
        />
      )}
      {aba === "turnos" && (
        <ListaSimples
          titulo="Turnos"
          itens={listas.turnos}
          onCriar={criarTurno}
          onEditar={editarTurno}
        />
      )}
      {aba === "supervisores" && (
        <ListaSimples
          titulo="Supervisores"
          itens={listas.supervisores}
          temAtivo
          onCriar={criarSupervisor}
          onEditar={editarSupervisor}
          onToggle={toggleSupervisor}
        />
      )}
      {aba === "profissionais" && (
        <ListaSimples
          titulo="Profissionais"
          itens={listas.profissionais}
          temAtivo
          onCriar={criarProfissional}
          onEditar={editarProfissional}
          onToggle={toggleProfissional}
        />
      )}
      {aba === "regioes" && (
        <ListaSimples
          titulo="Regiões do corpo"
          itens={listas.regioes}
          onCriar={criarRegiao}
          onEditar={editarRegiao}
        />
      )}
      {aba === "segmentos" && (
        <ListaSegmentos
          segmentos={listas.segmentos}
          regioes={listas.regioes}
        />
      )}
    </div>
  );
}

// ─── Lista simples (setores, turnos, supervisores, profissionais, regiões) ───

function ListaSimples({
  titulo,
  itens,
  temAtivo = false,
  onCriar,
  onEditar,
  onToggle,
}: {
  titulo: string;
  itens: ItemLista[];
  temAtivo?: boolean;
  onCriar: (nome: string) => Promise<{ ok: boolean; erro?: string }>;
  onEditar: (id: number, nome: string) => Promise<{ ok: boolean; erro?: string }>;
  onToggle?: (id: number, ativo: boolean) => Promise<{ ok: boolean; erro?: string }>;
}) {
  const [novo, setNovo] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function iniciarEdicao(item: ItemLista) {
    setEditandoId(item.id);
    setEditandoNome(item.nome);
    setErro(null);
  }

  function salvarEdicao() {
    if (!editandoId || !editandoNome.trim()) return;
    setErro(null);
    startTransition(async () => {
      const res = await onEditar(editandoId, editandoNome);
      if (res.ok) {
        setEditandoId(null);
        setEditandoNome("");
      } else {
        setErro(res.erro ?? "Erro ao salvar.");
      }
    });
  }

  function adicionar() {
    if (!novo.trim()) return;
    setErro(null);
    startTransition(async () => {
      const res = await onCriar(novo);
      if (res.ok) {
        setNovo("");
      } else {
        setErro(res.erro ?? "Erro ao criar.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
      </div>

      <ul className="divide-y divide-slate-100">
        {itens.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
            {editandoId === item.id ? (
              <>
                <input
                  value={editandoNome}
                  onChange={(e) => setEditandoNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarEdicao()}
                  className="h-8 flex-1 rounded border border-slate-300 px-2 text-sm focus:border-gtf-600 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={salvarEdicao}
                  disabled={pending}
                  className="text-xs font-medium text-gtf-700 hover:underline disabled:opacity-50"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditandoId(null)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span
                  className={`flex-1 text-sm ${!item.ativo ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {item.nome}
                </span>
                <button
                  onClick={() => iniciarEdicao(item)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Renomear
                </button>
                {temAtivo && onToggle && (
                  <button
                    onClick={() =>
                      startTransition(() => onToggle(item.id, !item.ativo).then())
                    }
                    className={`text-xs ${item.ativo ? "text-slate-400 hover:text-rose-600" : "text-emerald-600 hover:underline"}`}
                  >
                    {item.ativo ? "Desativar" : "Reativar"}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Adicionar */}
      <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder={`Novo ${titulo.toLowerCase().slice(0, -1)}…`}
          className="h-9 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:border-gtf-600 focus:outline-none"
        />
        <button
          onClick={adicionar}
          disabled={!novo.trim() || pending}
          className="rounded-md bg-gtf-700 px-4 text-sm font-medium text-white hover:bg-gtf-800 disabled:bg-slate-300"
        >
          Adicionar
        </button>
      </div>

      {erro && <p className="px-5 pb-3 text-xs text-rose-600">{erro}</p>}
    </div>
  );
}

// ─── Lista de segmentos (tem região como campo extra) ────────────────────────

function ListaSegmentos({
  segmentos,
  regioes,
}: {
  segmentos: SegmentoAdmin[];
  regioes: ItemLista[];
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novaRegiao, setNovaRegiao] = useState(regioes[0]?.id?.toString() ?? "");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [editandoRegiao, setEditandoRegiao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function iniciarEdicao(s: SegmentoAdmin) {
    setEditandoId(s.id);
    setEditandoNome(s.nome);
    setEditandoRegiao(s.regiaoId.toString());
    setErro(null);
  }

  function salvarEdicao() {
    if (!editandoId || !editandoNome.trim() || !editandoRegiao) return;
    setErro(null);
    startTransition(async () => {
      const res = await editarSegmento(editandoId, editandoNome, Number(editandoRegiao));
      if (res.ok) { setEditandoId(null); } else { setErro(res.erro ?? "Erro."); }
    });
  }

  function adicionar() {
    if (!novoNome.trim() || !novaRegiao) return;
    setErro(null);
    startTransition(async () => {
      const res = await criarSegmento(novoNome, Number(novaRegiao));
      if (res.ok) { setNovoNome(""); } else { setErro(res.erro ?? "Erro."); }
    });
  }

  const porRegiao = regioes.map((r) => ({
    regiao: r,
    itens: segmentos.filter((s) => s.regiaoId === r.id),
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Segmentos</h2>
      </div>

      {porRegiao.map(({ regiao, itens }) => (
        <div key={regiao.id}>
          <p className="bg-slate-50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {regiao.nome}
          </p>
          <ul className="divide-y divide-slate-100">
            {itens.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-2">
                {editandoId === s.id ? (
                  <>
                    <input
                      value={editandoNome}
                      onChange={(e) => setEditandoNome(e.target.value)}
                      className="h-8 flex-1 rounded border border-slate-300 px-2 text-sm focus:border-gtf-600 focus:outline-none"
                      autoFocus
                    />
                    <select
                      value={editandoRegiao}
                      onChange={(e) => setEditandoRegiao(e.target.value)}
                      className="h-8 rounded border border-slate-300 px-2 text-sm"
                    >
                      {regioes.map((r) => (
                        <option key={r.id} value={r.id}>{r.nome}</option>
                      ))}
                    </select>
                    <button onClick={salvarEdicao} disabled={pending} className="text-xs font-medium text-gtf-700 hover:underline disabled:opacity-50">Salvar</button>
                    <button onClick={() => setEditandoId(null)} className="text-xs text-slate-400 hover:text-slate-700">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${!s.ativo ? "text-slate-400 line-through" : "text-slate-800"}`}>{s.nome}</span>
                    <button onClick={() => iniciarEdicao(s)} className="text-xs text-slate-400 hover:text-slate-700">Renomear</button>
                    <button
                      onClick={() => startTransition(() => toggleSegmento(s.id, !s.ativo).then())}
                      className={`text-xs ${s.ativo ? "text-slate-400 hover:text-rose-600" : "text-emerald-600 hover:underline"}`}
                    >
                      {s.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Adicionar */}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="Novo segmento…"
          className="h-9 flex-1 min-w-32 rounded-md border border-slate-300 px-3 text-sm focus:border-gtf-600 focus:outline-none"
        />
        <select
          value={novaRegiao}
          onChange={(e) => setNovaRegiao(e.target.value)}
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          {regioes.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
        <button
          onClick={adicionar}
          disabled={!novoNome.trim() || !novaRegiao || pending}
          className="rounded-md bg-gtf-700 px-4 text-sm font-medium text-white hover:bg-gtf-800 disabled:bg-slate-300"
        >
          Adicionar
        </button>
      </div>

      {erro && <p className="px-5 pb-3 text-xs text-rose-600">{erro}</p>}
    </div>
  );
}
