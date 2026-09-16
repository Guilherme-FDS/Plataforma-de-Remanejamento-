/**
 * Regras de negócio. Tudo aqui é derivado dos dados — nenhum indicador ou
 * situação é digitado por alguém, que era a falha central da planilha.
 */
import type { Remanejamento, Situacao, TipoRestricao } from "./tipos";

/** Data de referência do sistema. Isolada para os testes e a UI baterem. */
export function hoje(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Converte "2026-08-25" sem passar por fuso horário. */
export function data(iso: string | null): Date | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
}

export function somarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

export function diferencaEmDias(de: Date, ate: Date): number {
  return Math.round((ate.getTime() - de.getTime()) / 86_400_000);
}

/** Previsão de término. Vem calculada do banco (coluna gerada). */
export function previsaoFim(r: Remanejamento): Date | null {
  return data(r.dataPrevistaFim);
}

/**
 * ESPELHA a função `situacao_remanejamento()` do Postgres. As duas precisam
 * dar o mesmo resultado — alterou aqui, altere lá (0001_schema.sql, Bloco 5).
 */
export function situacaoDe(r: Remanejamento, ref: Date = hoje()): Situacao {
  if (r.dataEncerramento) return "encerrado";
  if (r.duracaoTipo === "permanente") return "permanente";
  if (r.duracaoTipo === "gestacao" || r.duracaoTipo === "licenca") {
    return "acompanhamento";
  }

  const fim = previsaoFim(r);
  if (!fim) return "sem_previsao";
  return fim >= ref ? "em_andamento" : "a_encerrar";
}

export const SITUACAO_ROTULO: Record<Situacao, string> = {
  em_andamento: "Em andamento",
  a_encerrar: "A encerrar",
  encerrado: "Encerrado",
  permanente: "Permanente",
  acompanhamento: "Acompanhamento",
  sem_previsao: "Sem previsão",
};

export const SITUACAO_COR: Record<Situacao, string> = {
  em_andamento: "bg-sky-50 text-sky-700 ring-sky-600/20",
  a_encerrar: "bg-amber-50 text-amber-800 ring-amber-600/30",
  encerrado: "bg-slate-100 text-slate-600 ring-slate-500/20",
  permanente: "bg-violet-50 text-violet-700 ring-violet-600/20",
  acompanhamento: "bg-teal-50 text-teal-700 ring-teal-600/20",
  sem_previsao: "bg-rose-50 text-rose-700 ring-rose-600/30",
};

export const TIPO_ROTULO: Record<TipoRestricao, string> = {
  clinico: "Clínico",
  ocupacional: "Ocupacional",
  acidente_trabalho: "Acidente de Trabalho",
  acidente_domestico: "Acidente Doméstico",
  indefinido: "Indefinido",
};

export const LATERALIDADE_ROTULO: Record<string, string> = {
  direito: "D",
  esquerdo: "E",
  bilateral: "D+E",
};

/** Situações que significam "ainda na carteira". */
export const SITUACOES_ABERTAS: Situacao[] = [
  "em_andamento",
  "a_encerrar",
  "permanente",
  "acompanhamento",
  "sem_previsao",
];

export function estaAberto(r: Remanejamento, ref: Date = hoje()): boolean {
  return SITUACOES_ABERTAS.includes(situacaoDe(r, ref));
}

export interface PendenciaAutomatica {
  remanejamentoId: number;
  colaboradorId: number;
  nome: string;
  matricula: number | null;
  setor: string | null;
  motivos: string[];
}

/**
 * Lançamentos vigentes com dado faltando. Não fica guardado em lugar
 * nenhum: é recalculado a cada carregamento da tela, então some sozinho
 * assim que o campo é preenchido — não existe "pendência resolvida" para
 * ficar presa na lista.
 *
 * Olha só o que está em aberto: caso já encerrado com dado incompleto é
 * histórico, não é trabalho a fazer.
 */
export function pendenciasAutomaticas(
  itens: Remanejamento[],
  ref: Date = hoje(),
): PendenciaAutomatica[] {
  const saida: PendenciaAutomatica[] = [];

  for (const r of itens) {
    if (!estaAberto(r, ref)) continue;

    const motivos: string[] = [];
    if (r.matricula === null) motivos.push("Sem matrícula");
    if (situacaoDe(r, ref) === "sem_previsao")
      motivos.push("Sem duração — não dá para acompanhar o prazo");
    if (!r.segmento || r.regiao === "Não classificado")
      motivos.push("Segmento do corpo não classificado");
    if (r.tipo === "indefinido") motivos.push("Tipo de restrição indefinido");

    if (motivos.length > 0) {
      saida.push({
        remanejamentoId: r.id,
        colaboradorId: r.colaboradorId,
        nome: r.nome,
        matricula: r.matricula,
        setor: r.setor,
        motivos,
      });
    }
  }

  // Quem tem mais buracos aparece primeiro.
  return saida.sort((a, b) => b.motivos.length - a.motivos.length);
}

export type SituacaoRelatorio = "todos" | "abertos" | "encerrados";

/**
 * Filtro do relatório (setores + situação). Compartilhado entre a tela
 * interativa (client) e a página de impressão (server) — as duas precisam
 * aplicar exatamente o mesmo filtro para o PDF bater com o que a pessoa via
 * na tela antes de mandar imprimir.
 */
export function filtrarRelatorio(
  todos: Remanejamento[],
  opcoes: { setores?: string[]; situacao?: SituacaoRelatorio },
  ref: Date = hoje(),
): Remanejamento[] {
  const setoresSel = opcoes.setores ?? [];
  const situacaoSel = opcoes.situacao ?? "todos";
  return todos.filter((r) => {
    if (setoresSel.length > 0 && !setoresSel.includes(r.setor ?? ""))
      return false;
    if (situacaoSel === "abertos") return estaAberto(r, ref);
    if (situacaoSel === "encerrados")
      return !estaAberto(r, ref) && !!r.dataEncerramento;
    return true;
  });
}

/** Dias até a previsão de término. Negativo = já venceu. */
export function diasAteFim(r: Remanejamento, ref: Date = hoje()): number | null {
  const fim = previsaoFim(r);
  return fim ? diferencaEmDias(ref, fim) : null;
}

export function anoDe(r: Remanejamento): number | null {
  return r.dataInicio ? Number(r.dataInicio.slice(0, 4)) : null;
}

export function mesDe(r: Remanejamento): number | null {
  return r.dataInicio ? Number(r.dataInicio.slice(5, 7)) : null;
}

export const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// --------------------------------------------------------------- agregações

export function contarPor<T extends string>(
  itens: Remanejamento[],
  chave: (r: Remanejamento) => T | null,
): { rotulo: T; total: number }[] {
  const mapa = new Map<T, number>();
  for (const r of itens) {
    const k = chave(r);
    if (k === null) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([rotulo, total]) => ({ rotulo, total }))
    .sort((a, b) => b.total - a.total);
}

export function porMes(itens: Remanejamento[], ano: number): number[] {
  const meses = new Array(12).fill(0);
  for (const r of itens) {
    if (anoDe(r) !== ano) continue;
    const m = mesDe(r);
    if (m) meses[m - 1] += 1;
  }
  return meses;
}

export function anosDisponiveis(itens: Remanejamento[]): number[] {
  const anos = new Set<number>();
  for (const r of itens) {
    const a = anoDe(r);
    if (a) anos.add(a);
  }
  return [...anos].sort((a, b) => b - a);
}

/** Duração em dias das restrições temporárias (ignora permanentes). */
export function estatisticaDuracao(itens: Remanejamento[]): {
  n: number;
  media: number;
  mediana: number;
  totalDias: number;
} {
  const dias = itens
    .filter((r) => r.duracaoTipo === "dias" && r.duracaoDias)
    .map((r) => r.duracaoDias as number)
    .sort((a, b) => a - b);
  if (dias.length === 0) return { n: 0, media: 0, mediana: 0, totalDias: 0 };
  const total = dias.reduce((s, d) => s + d, 0);
  return {
    n: dias.length,
    media: Math.round(total / dias.length),
    mediana: dias[Math.floor(dias.length / 2)],
    totalDias: total,
  };
}

export interface Reincidencia {
  colaboradorId: number;
  matricula: number | null;
  nome: string;
  eventos: Remanejamento[];
  mesmaRegiao: boolean;
  intervaloDias: number | null;
}

/** Colaboradores com 2+ remanejamentos — o sinal de que a medida não pegou. */
export function reincidencias(itens: Remanejamento[]): Reincidencia[] {
  const porPessoa = new Map<number, Remanejamento[]>();
  for (const r of itens) {
    if (r.possivelDuplicataDe) continue; // duplicata nao e reincidencia
    const lista = porPessoa.get(r.colaboradorId) ?? [];
    lista.push(r);
    porPessoa.set(r.colaboradorId, lista);
  }

  const saida: Reincidencia[] = [];
  for (const [colaboradorId, eventos] of porPessoa) {
    if (eventos.length < 2) continue;
    const ordenados = [...eventos].sort((a, b) =>
      (a.dataInicio ?? "").localeCompare(b.dataInicio ?? ""),
    );
    const regioes = new Set(ordenados.map((e) => e.regiao).filter(Boolean));
    const primeira = data(ordenados[0].dataInicio);
    const ultima = data(ordenados[ordenados.length - 1].dataInicio);
    saida.push({
      colaboradorId,
      matricula: ordenados[0].matricula,
      nome: ordenados[0].nome,
      eventos: ordenados,
      mesmaRegiao: regioes.size === 1,
      intervaloDias:
        primeira && ultima ? diferencaEmDias(primeira, ultima) : null,
    });
  }
  return saida.sort((a, b) => b.eventos.length - a.eventos.length);
}

export interface Cluster {
  setor: string;
  regiao: string;
  total: number;
  eventos: Remanejamento[];
}

/**
 * Concentração de lesões da mesma região num mesmo setor dentro da janela.
 * É o gatilho de análise ergonômica: não interessa o caso isolado, interessa
 * o padrão.
 */
export function clusters(
  itens: Remanejamento[],
  janelaDias = 180,
  minimo = 3,
  ref: Date = hoje(),
): Cluster[] {
  const limite = somarDias(ref, -janelaDias);
  const mapa = new Map<string, Remanejamento[]>();

  for (const r of itens) {
    const inicio = data(r.dataInicio);
    if (!inicio || inicio < limite || !r.setor || !r.regiao) continue;
    if (r.regiao === "Não classificado") continue;
    const k = `${r.setor}|${r.regiao}`;
    const lista = mapa.get(k) ?? [];
    lista.push(r);
    mapa.set(k, lista);
  }

  return [...mapa.entries()]
    .filter(([, eventos]) => eventos.length >= minimo)
    .map(([k, eventos]) => {
      const [setor, regiao] = k.split("|");
      return { setor, regiao, total: eventos.length, eventos };
    })
    .sort((a, b) => b.total - a.total);
}

// ----------------------------------------------------------------- formato

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataObj(d: Date | null): string {
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function descreverDuracao(r: Remanejamento): string {
  switch (r.duracaoTipo) {
    case "dias":
      return `${r.duracaoDias} dias`;
    case "permanente":
      return "Permanente";
    case "gestacao":
      return "Até o fim da gestação";
    case "licenca":
      return "Licença-maternidade";
    default:
      return "—";
  }
}

export function descreverSegmento(r: Remanejamento): string {
  if (!r.segmento) return "—";
  const lado = r.lateralidade ? LATERALIDADE_ROTULO[r.lateralidade] : null;
  return lado ? `${r.segmento} (${lado})` : r.segmento;
}

/** Compara texto ignorando acento e caixa — usado nas buscas. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
