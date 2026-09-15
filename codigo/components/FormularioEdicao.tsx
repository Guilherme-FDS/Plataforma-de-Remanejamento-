"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarRemanejamento } from "@/app/actions/remanejamentos";
import { formatarDataObj, somarDias } from "@/lib/calculos";
import type { DuracaoTipo, Listas, Remanejamento, TipoRestricao } from "@/lib/tipos";

const DURACOES: { valor: DuracaoTipo; rotulo: string }[] = [
  { valor: "dias", rotulo: "Prazo em dias" },
  { valor: "permanente", rotulo: "Permanente" },
  { valor: "gestacao", rotulo: "Até o fim da gestação" },
  { valor: "licenca", rotulo: "Licença-maternidade" },
];

const PRAZOS_RAPIDOS = [7, 15, 30, 60, 90, 120, 180];

const rotuloCampo =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";
const campo =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600";

export default function FormularioEdicao({
  remanj,
  listas,
}: {
  remanj: Remanejamento;
  listas: Listas;
}) {
  const router = useRouter();
  const [setor, setSetor] = useState(remanj.setor ?? "");
  const [turno, setTurno] = useState(remanj.turno ?? "");
  const [supervisor, setSupervisor] = useState(remanj.supervisor ?? "");
  const [dataInicio, setDataInicio] = useState(remanj.dataInicio);
  const [duracaoTipo, setDuracaoTipo] = useState<DuracaoTipo>(remanj.duracaoTipo);
  const [duracaoDias, setDuracaoDias] = useState<number | "">(remanj.duracaoDias ?? "");
  const [causa, setCausa] = useState(remanj.causa ?? "");
  const [segmento, setSegmento] = useState(remanj.segmento ?? "");
  const [lateralidade, setLateralidade] = useState(remanj.lateralidade ?? "");
  const [contraindicacao, setContraindicacao] = useState(remanj.contraindicacao ?? "");
  const [tipo, setTipo] = useState<TipoRestricao | "">(remanj.tipo);
  const [profissional, setProfissional] = useState(remanj.profissional ?? "");
  const [observacoes, setObservacoes] = useState(remanj.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const porRegiao = useMemo(() => {
    const grupos = new Map<string, string[]>();
    for (const s of listas.segmentos.filter((s) => s.regiao !== "Não classificado")) {
      const lista = grupos.get(s.regiao) ?? [];
      lista.push(s.nome);
      grupos.set(s.regiao, lista);
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [listas.segmentos]);

  const previsao = useMemo(() => {
    if (duracaoTipo !== "dias" || !duracaoDias || !dataInicio) return null;
    const [a, m, d] = dataInicio.split("-").map(Number);
    if (!a || !m || !d) return null;
    return somarDias(new Date(a, m - 1, d), Number(duracaoDias));
  }, [duracaoTipo, duracaoDias, dataInicio]);

  const faltando = [
    !setor && "setor",
    !turno && "turno",
    !dataInicio && "data de início",
    duracaoTipo === "dias" && !duracaoDias && "prazo em dias",
    !segmento && "segmento",
    !tipo && "tipo",
  ].filter(Boolean) as string[];

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (faltando.length > 0) return;
    setErro(null);
    startTransition(async () => {
      const res = await editarRemanejamento(remanj.id, {
        setor,
        turno,
        supervisor: supervisor || null,
        dataInicio,
        duracaoTipo,
        duracaoDias: duracaoTipo === "dias" ? Number(duracaoDias) : null,
        causa: causa || null,
        segmento,
        lateralidade: lateralidade || null,
        contraindicacao: contraindicacao || null,
        tipo,
        profissional: profissional || null,
        observacoes: observacoes || null,
      });
      if (res.ok) {
        router.push(`/colaboradores/${remanj.colaboradorId}`);
      } else {
        setErro(res.erro ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      {/* Identificação — somente leitura */}
      <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Colaborador
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className={rotuloCampo}>Matrícula</p>
            <p className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500">
              {remanj.matricula ?? "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className={rotuloCampo}>Nome</p>
            <p className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500">
              {remanj.nome}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Select id="setor" rotulo="Setor" valor={setor} aoMudar={setSetor} opcoes={listas.setores} />
          <Select id="turno" rotulo="Turno" valor={turno} aoMudar={setTurno} opcoes={listas.turnos} />
          <Select id="supervisor" rotulo="Supervisor" valor={supervisor} aoMudar={setSupervisor} opcoes={listas.supervisores} />
        </div>
      </fieldset>

      {/* Restrição */}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Restrição
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={rotuloCampo} htmlFor="segmento">
              Segmento afetado
            </label>
            <select
              id="segmento"
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              className={campo}
            >
              <option value="">Selecione…</option>
              {porRegiao.map(([regiao, nomes]) => (
                <optgroup key={regiao} label={regiao}>
                  {nomes.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <span className={rotuloCampo}>Lateralidade</span>
            <div className="flex gap-1.5">
              {[
                { v: "", r: "N/A" },
                { v: "direito", r: "Direito" },
                { v: "esquerdo", r: "Esquerdo" },
                { v: "bilateral", r: "Bilateral" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setLateralidade(o.v)}
                  className={`h-10 flex-1 rounded-md border text-sm transition ${
                    lateralidade === o.v
                      ? "border-gtf-700 bg-gtf-700 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {o.r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className={rotuloCampo} htmlFor="causa">
            Causa / diagnóstico
          </label>
          <input
            id="causa"
            value={causa}
            onChange={(e) => setCausa(e.target.value)}
            className={campo}
          />
        </div>

        <div className="mt-4">
          <label className={rotuloCampo} htmlFor="contraindicacao">
            Contraindicação
          </label>
          <textarea
            id="contraindicacao"
            value={contraindicacao}
            onChange={(e) => setContraindicacao(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gtf-600 focus:outline-none focus:ring-1 focus:ring-gtf-600"
          />
        </div>

        <div className="mt-4">
          <span className={rotuloCampo}>Tipo</span>
          <div className="flex flex-wrap gap-1.5">
            {listas.tipos
              .filter((t) => t.id !== "indefinido")
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`h-10 rounded-md border px-3.5 text-sm transition ${
                    tipo === t.id
                      ? "border-gtf-700 bg-gtf-700 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {t.rotulo}
                </button>
              ))}
          </div>
        </div>
      </fieldset>

      {/* Prazo */}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Prazo
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={rotuloCampo} htmlFor="dataInicio">
              Início
            </label>
            <input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label className={rotuloCampo} htmlFor="duracaoTipo">
              Duração
            </label>
            <select
              id="duracaoTipo"
              value={duracaoTipo}
              onChange={(e) => setDuracaoTipo(e.target.value as DuracaoTipo)}
              className={campo}
            >
              {DURACOES.map((d) => (
                <option key={d.valor} value={d.valor}>{d.rotulo}</option>
              ))}
            </select>
          </div>
        </div>

        {duracaoTipo === "dias" && (
          <div className="mt-4">
            <label className={rotuloCampo} htmlFor="duracaoDias">
              Dias
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRAZOS_RAPIDOS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuracaoDias(d)}
                  className={`h-10 w-14 rounded-md border text-sm tabular-nums transition ${
                    duracaoDias === d
                      ? "border-gtf-700 bg-gtf-700 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {d}
                </button>
              ))}
              <input
                id="duracaoDias"
                type="number"
                min={1}
                max={999}
                value={duracaoDias}
                onChange={(e) =>
                  setDuracaoDias(e.target.value ? Number(e.target.value) : "")
                }
                className={`${campo} w-24`}
              />
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Previsão de término
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
            {duracaoTipo === "dias"
              ? formatarDataObj(previsao)
              : duracaoTipo === "permanente"
                ? "Sem prazo — reavaliação periódica"
                : "Definida por evento, não por data"}
          </p>
        </div>
      </fieldset>

      {/* Registro */}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Registro
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="profissional"
            rotulo="Profissional responsável"
            valor={profissional}
            aoMudar={setProfissional}
            opcoes={listas.profissionais}
          />
          <div>
            <label className={rotuloCampo} htmlFor="observacoes">
              Observações
            </label>
            <input
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className={campo}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={faltando.length > 0 || pending}
          className="rounded-md bg-gtf-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          Cancelar
        </button>
        {faltando.length > 0 && (
          <p className="text-xs text-slate-500">Falta: {faltando.join(", ")}.</p>
        )}
        {erro && <p className="text-xs text-rose-600">{erro}</p>}
      </div>
    </form>
  );
}

function Select({
  id,
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <div>
      <label className={rotuloCampo} htmlFor={id}>
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={campo}
      >
        <option value="">Selecione…</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
