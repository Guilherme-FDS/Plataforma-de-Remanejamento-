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
 * data de início, duração e encerramento. Ver `situacaoDe()` em calculos.ts.
 */
export type Situacao =
  | "em_andamento" // previsão de término ainda no futuro
  | "a_encerrar" // previsão venceu e ninguém confirmou o encerramento
  | "encerrado" // encerramento confirmado
  | "permanente" // restrição sem prazo
  | "acompanhamento" // gestação / licença — termina por evento, não por data
  | "sem_previsao"; // falta duração; não dá para acompanhar

export interface Colaborador {
  matricula: number;
  nome: string;
  setor: string | null;
  turno: string | null;
}

export interface Remanejamento {
  linhaOrigem: number;
  matricula: number | null;
  nome: string;
  dataInicio: string | null;
  setor: string | null;
  turno: string | null;
  duracaoTipo: DuracaoTipo;
  duracaoDias: number | null;
  causa: string | null;
  segmento: string | null;
  regiao: string | null;
  lateralidade: Lateralidade;
  contraindicacao: string | null;
  supervisor: string | null;
  tipo: TipoRestricao;
  observacoes: string | null;
  profissional: string | null;
  /**
   * Na planilha, a coluna ENCERRAMENTO era preenchida no momento do
   * lançamento (início + tempo), ou seja: é PREVISÃO de término, não a data
   * em que o caso de fato foi resolvido. O sistema passa a separar as duas
   * coisas — este campo guarda a previsão.
   */
  dataEncerramento: string | null;
  /** "PERMANENTE", "FINAL DA GESTACAO"… quando o campo não era uma data. */
  encerramentoTexto: string | null;
  duplicataDe?: number;
}

export interface Pendencia {
  linha: number;
  campo: string;
  motivo: string;
  valorOriginal: string;
  acao: "corrigido" | "revisar" | "descartado";
  colaborador: string;
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
