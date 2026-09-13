"use client";

import { useMemo, useState } from "react";
import { formatarDataObj, somarDias } from "@/lib/calculos";
import type { Colaborador, DuracaoTipo, Listas, TipoRestricao } from "@/lib/tipos";

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
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function FormularioLancamento({
  colaboradores,
  listas,
  sugestoes,
}: {
  colaboradores: Colaborador[];
  listas: Listas;
  sugestoes: Record<string, string[]>;
}) {
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [turno, setTurno] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeIso);
  const [duracaoTipo, setDuracaoTipo] = useState<DuracaoTipo>("dias");
  const [duracaoDias, setDuracaoDias] = useState<number | "">(30);
  const [causa, setCausa] = useState("");
  const [segmento, setSegmento] = useState("");
  const [lateralidade, setLateralidade] = useState("");
  const [contraindicacao, setContraindicacao] = useState("");
  const [tipo, setTipo] = useState<TipoRestricao | "">("");
  const [profissional, setProfissional] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvo, setSalvo] = useState<Record<string, unknown> | null>(null);

  const porMatricula = useMemo(() => {
    const m = new Map<number, Colaborador>();
    for (const c of colaboradores) m.set(c.matricula, c);
    return m;
  }, [colaboradores]);

  const encontrado = porMatricula.get(Number(matricula));

  // Segmentos válidos: os que foram classificados numa região conhecida.
  const segmentosValidos = useMemo(
    () => listas.segmentos.filter((s) => s.regiao !== "Não classificado"),
    [listas.segmentos],
  );

  const porRegiao = useMemo(() => {
    const grupos = new Map<string, string[]>();
    for (const s of segmentosValidos) {
      const lista = grupos.get(s.regiao) ?? [];
      lista.push(s.nome);
      grupos.set(s.regiao, lista);
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [segmentosValidos]);

  function aplicarMatricula(valor: string) {
    setMatricula(valor);
    const c = porMatricula.get(Number(valor));
    if (c) {
      setNome(c.nome);
      setSetor(c.setor ?? "");
      setTurno(c.turno ?? "");
    }
  }

  const previsao = useMemo(() => {
    if (duracaoTipo !== "dias" || !duracaoDias || !dataInicio) return null;
    const [a, m, d] = dataInicio.split("-").map(Number);
    if (!a || !m || !d) return null;
    return somarDias(new Date(a, m - 1, d), Number(duracaoDias));
  }, [duracaoTipo, duracaoDias, dataInicio]);

  const sugestoesDoSegmento = segmento ? (sugestoes[segmento] ?? []) : [];

  const faltando = [
    !matricula && "matrícula",
    !nome && "nome",
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
    setSalvo({
      matricula: Number(matricula),
      nome,
      setor,
      turno,
      supervisor: supervisor || null,
      dataInicio,
      duracaoTipo,
      duracaoDias: duracaoTipo === "dias" ? Number(duracaoDias) : null,
      dataPrevistaFim: previsao ? previsao.toISOString().slice(0, 10) : null,
      causa: causa || null,
      segmento,
      regiao: segmentosValidos.find((s) => s.nome === segmento)?.regiao ?? null,
      lateralidade: lateralidade || null,
      contraindicacao: contraindicacao || null,
      tipo,
      profissional: profissional || null,
      observacoes: observacoes || null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpar() {
    setMatricula("");
    setNome("");
    setSetor("");
    setTurno("");
    setSupervisor("");
    setDataInicio(hojeIso);
    setDuracaoTipo("dias");
    setDuracaoDias(30);
    setCausa("");
    setSegmento("");
    setLateralidade("");
    setContraindicacao("");
    setTipo("");
    setProfissional("");
    setObservacoes("");
    setSalvo(null);
  }

  if (salvo) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-base font-semibold text-emerald-900">
          Lançamento validado
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          Este é o registro exatamente como seria gravado — já normalizado, com
          a previsão calculada. A gravação entra quando o Supabase estiver
          conectado.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-white p-4 text-xs leading-relaxed text-slate-700 ring-1 ring-emerald-200">
          {JSON.stringify(salvo, null, 2)}
        </pre>
        <button
          type="button"
          onClick={limpar}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Lançar outro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      {/* ---------------------------------------------------- colaborador */}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Colaborador
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={rotuloCampo} htmlFor="matricula">
              Matrícula
            </label>
            <input
              id="matricula"
              inputMode="numeric"
              value={matricula}
              onChange={(e) =>
                aplicarMatricula(e.target.value.replace(/\D/g, ""))
              }
              placeholder="58317"
              className={campo}
              autoFocus
            />
            {matricula && (
              <p
                className={`mt-1 text-xs ${encontrado ? "text-emerald-600" : "text-amber-600"}`}
              >
                {encontrado ? "Já cadastrado" : "Novo colaborador"}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className={rotuloCampo} htmlFor="nome">
              Nome
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
              readOnly={!!encontrado}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Select
            id="setor"
            rotulo="Setor"
            valor={setor}
            aoMudar={setSetor}
            opcoes={listas.setores}
          />
          <Select
            id="turno"
            rotulo="Turno"
            valor={turno}
            aoMudar={setTurno}
            opcoes={listas.turnos}
          />
          <Select
            id="supervisor"
            rotulo="Supervisor"
            valor={supervisor}
            aoMudar={setSupervisor}
            opcoes={listas.supervisores}
          />
        </div>
      </fieldset>

      {/* -------------------------------------------------------- restrição */}
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
                    <option key={n} value={n}>
                      {n}
                    </option>
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
                      ? "border-slate-900 bg-slate-900 text-white"
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
            placeholder="Tendinopatia do ombro"
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
            placeholder="O que o colaborador não pode fazer"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {sugestoesDoSegmento.length > 0 && (
            <div className="mt-2">
              <p className="mb-1.5 text-xs text-slate-500">
                Já usadas para {segmento}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesDoSegmento.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setContraindicacao(s)}
                    title={s}
                    className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    {s.length > 60 ? `${s.slice(0, 60)}…` : s}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {t.rotulo}
                </button>
              ))}
          </div>
        </div>
      </fieldset>

      {/* ---------------------------------------------------------- prazo */}
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
                <option key={d.valor} value={d.valor}>
                  {d.rotulo}
                </option>
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
                      ? "border-slate-900 bg-slate-900 text-white"
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

      {/* ----------------------------------------------------- responsável */}
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
          disabled={faltando.length > 0}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Salvar lançamento
        </button>
        <button
          type="button"
          onClick={limpar}
          className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Limpar
        </button>
        {faltando.length > 0 && (
          <p className="text-xs text-slate-500">Falta: {faltando.join(", ")}.</p>
        )}
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
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
