export type DuracaoTipo =
  | "dias"
  | "permanente"
  | "gestacao"
  | "licenca"
  | "indefinido";

export type TipoRestricao =
  | "clinico"
  | "ocupacional"
  | "acidente_trabalho"
  | "acidente_domestico"
  | "indefinido";

export type Lateralidade = "direito" | "esquerdo" | "bilateral" | null;

/**
 * Situação de um remanejamento. Nunca é digitada — sempre derivada de
 * duração, previsão e encerramento.
 *
 * A regra existe em dois lugares que precisam concordar: `situacaoDe()` em
 * calculos.ts (usada pelas telas) e a função `situacao_remanejamento()` no
 * Postgres (usada pela view e por consultas SQL). Mexeu numa, mexa na outra.
 */
export type Situacao =
  | "em_andamento" // previsão de término ainda no futuro
  | "a_encerrar" // previsão venceu e ninguém confirmou o desfecho
  | "encerrado" // desfecho confirmado
  | "permanente" // restrição sem prazo
  | "acompanhamento" // gestação / licença — termina por evento, não por data
  | "sem_previsao"; // falta duração; não dá para acompanhar

export interface Colaborador {
  id: number;
  matricula: number;
  nome: string;
  setor: string | null;
  turno: string | null;
}

export interface Remanejamento {
  id: number;
  colaboradorId: number;
  matricula: number;
  nome: string;

  dataInicio: string;
  duracaoTipo: DuracaoTipo;
  duracaoDias: number | null;
  /** Calculada pelo banco (coluna gerada): início + duração. Nunca digitada. */
  dataPrevistaFim: string | null;
  /** Desfecho de fato. Vazio enquanto o caso não for encerrado. */
  dataEncerramento: string | null;

  setor: string | null;
  turno: string | null;
  supervisor: string | null;

  tipo: TipoRestricao;
  causa: string | null;
  segmento: string | null;
  regiao: string | null;
  lateralidade: Lateralidade;
  contraindicacao: string | null;
  observacoes: string | null;
  profissional: string | null;

  /** 'planilha' para o que veio da importação, 'sistema' para o resto. */
  origem: string;
  linhaOrigem: number | null;
}

export interface Pendencia {
  id: number;
  linha: number;
  campo: string;
  motivo: string;
  valorOriginal: string;
  acao: "corrigido" | "revisar" | "descartado";
  colaborador: string;
  resolvida: boolean;
}

export interface Segmento {
  nome: string;
  regiao: string;
}

export interface Listas {
  setores: string[];
  turnos: string[];
  supervisores: string[];
  profissionais: string[];
  segmentos: Segmento[];
  tipos: { id: TipoRestricao; rotulo: string }[];
}
