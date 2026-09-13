/**
 * Camada de dados — ÚNICO ponto de acesso às informações.
 *
 * Todas as consultas passam pelo cliente com a sessão do usuário, então a RLS
 * do Postgres é quem decide o que volta. Sem login, tudo devolve vazio.
 */
import { cache } from "react";
import { clienteServidor } from "./supabase-servidor";
import type {
  Colaborador,
  Listas,
  Pendencia,
  Remanejamento,
  Segmento,
  TipoRestricao,
} from "./tipos";

const TIPOS: { id: TipoRestricao; rotulo: string }[] = [
  { id: "clinico", rotulo: "Clínico" },
  { id: "ocupacional", rotulo: "Ocupacional" },
  { id: "acidente_trabalho", rotulo: "Acidente de Trabalho" },
  { id: "acidente_domestico", rotulo: "Acidente Doméstico" },
  { id: "indefinido", rotulo: "Indefinido" },
];

/** Linha crua de vw_remanejamentos. */
interface LinhaView {
  id: number;
  colaborador_id: number;
  matricula: number;
  colaborador: string;
  data_inicio: string;
  duracao_tipo: Remanejamento["duracaoTipo"];
  duracao_dias: number | null;
  data_prevista_fim: string | null;
  data_encerramento: string | null;
  setor: string | null;
  turno: string | null;
  supervisor: string | null;
  tipo: TipoRestricao;
  causa: string | null;
  segmento: string | null;
  regiao: string | null;
  lado: Remanejamento["lateralidade"];
  contraindicacao: string | null;
  observacoes: string | null;
  profissional: string | null;
  origem: string;
  linha_origem: number | null;
}

function converter(l: LinhaView): Remanejamento {
  return {
    id: l.id,
    colaboradorId: l.colaborador_id,
    matricula: l.matricula,
    nome: l.colaborador,
    dataInicio: l.data_inicio,
    duracaoTipo: l.duracao_tipo,
    duracaoDias: l.duracao_dias,
    dataPrevistaFim: l.data_prevista_fim,
    dataEncerramento: l.data_encerramento,
    setor: l.setor,
    turno: l.turno,
    supervisor: l.supervisor,
    tipo: l.tipo,
    causa: l.causa,
    segmento: l.segmento,
    regiao: l.regiao,
    lateralidade: l.lado,
    contraindicacao: l.contraindicacao,
    observacoes: l.observacoes,
    profissional: l.profissional,
    origem: l.origem,
    linhaOrigem: l.linha_origem,
  };
}

/**
 * `cache` de-duplica a consulta dentro de uma mesma renderização: o Painel
 * chama isto várias vezes (indicadores, alertas, clusters) e só vai ao banco
 * uma vez.
 */
export const listarRemanejamentos = cache(
  async (): Promise<Remanejamento[]> => {
    const supabase = clienteServidor();
    const { data, error } = await supabase
      .from("vw_remanejamentos")
      .select("*")
      .order("data_inicio", { ascending: false });

    if (error) throw new Error(`Falha ao ler remanejamentos: ${error.message}`);
    return (data as LinhaView[]).map(converter);
  },
);

export const listarColaboradores = cache(async (): Promise<Colaborador[]> => {
  const supabase = clienteServidor();
  const { data, error } = await supabase
    .from("colaboradores")
    .select("id, matricula, nome, setores(nome), turnos(nome)")
    .order("nome");

  if (error) throw new Error(`Falha ao ler colaboradores: ${error.message}`);

  return (data ?? []).map((c) => {
    const linha = c as unknown as {
      id: number;
      matricula: number;
      nome: string;
      setores: { nome: string } | null;
      turnos: { nome: string } | null;
    };
    return {
      id: linha.id,
      matricula: linha.matricula,
      nome: linha.nome,
      setor: linha.setores?.nome ?? null,
      turno: linha.turnos?.nome ?? null,
    };
  });
});

export const obterListas = cache(async (): Promise<Listas> => {
  const supabase = clienteServidor();

  const [setores, turnos, supervisores, profissionais, segmentos] =
    await Promise.all([
      supabase.from("setores").select("nome").eq("ativo", true).order("nome"),
      supabase.from("turnos").select("nome").order("nome"),
      supabase
        .from("supervisores")
        .select("nome")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("profissionais")
        .select("nome")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("segmentos")
        .select("nome, regioes_corporais(nome)")
        .eq("ativo", true)
        .order("nome"),
    ]);

  const erro =
    setores.error ??
    turnos.error ??
    supervisores.error ??
    profissionais.error ??
    segmentos.error;
  if (erro) throw new Error(`Falha ao ler as listas: ${erro.message}`);

  const nomes = (r: { data: { nome: string }[] | null }) =>
    (r.data ?? []).map((x) => x.nome);

  const segs: Segmento[] = (segmentos.data ?? []).map((s) => {
    const linha = s as unknown as {
      nome: string;
      regioes_corporais: { nome: string } | null;
    };
    return {
      nome: linha.nome,
      regiao: linha.regioes_corporais?.nome ?? "Não classificado",
    };
  });

  return {
    setores: nomes(setores),
    turnos: nomes(turnos),
    supervisores: nomes(supervisores),
    profissionais: nomes(profissionais),
    segmentos: segs.sort(
      (a, b) => a.regiao.localeCompare(b.regiao) || a.nome.localeCompare(b.nome),
    ),
    tipos: TIPOS,
  };
});

export const listarPendencias = cache(async (): Promise<Pendencia[]> => {
  const supabase = clienteServidor();
  const { data, error } = await supabase
    .from("importacao_pendencias")
    .select("*")
    .order("linha");

  if (error) throw new Error(`Falha ao ler pendências: ${error.message}`);

  return (data ?? []).map((p) => {
    const linha = p as {
      id: number;
      linha: number;
      campo: string;
      motivo: string;
      valor_original: string;
      acao: Pendencia["acao"];
      colaborador: string;
      resolvida: boolean;
    };
    return {
      id: linha.id,
      linha: linha.linha,
      campo: linha.campo,
      motivo: linha.motivo,
      valorOriginal: linha.valor_original,
      acao: linha.acao,
      colaborador: linha.colaborador,
      resolvida: linha.resolvida,
    };
  });
});

export async function obterColaborador(
  matricula: number,
): Promise<Colaborador | undefined> {
  const todos = await listarColaboradores();
  return todos.find((c) => c.matricula === matricula);
}

export async function historicoDoColaborador(
  matricula: number,
): Promise<Remanejamento[]> {
  const todos = await listarRemanejamentos();
  return todos.filter((r) => r.matricula === matricula);
}

/**
 * Contraindicações já escritas antes, por segmento. Vira sugestão no
 * formulário: a mesma frase era redigitada dezenas de vezes na planilha.
 */
export const sugestoesContraindicacao = cache(
  async (): Promise<Record<string, string[]>> => {
    const supabase = clienteServidor();
    const { data, error } = await supabase
      .from("contraindicacoes_modelo")
      .select("texto, usos, segmentos(nome)")
      .order("usos", { ascending: false });

    if (error) throw new Error(`Falha ao ler contraindicações: ${error.message}`);

    const saida: Record<string, string[]> = {};
    for (const linha of data ?? []) {
      const m = linha as unknown as {
        texto: string;
        segmentos: { nome: string } | null;
      };
      const segmento = m.segmentos?.nome;
      if (!segmento) continue;
      const lista = (saida[segmento] ??= []);
      if (lista.length < 6) lista.push(m.texto);
    }
    return saida;
  },
);

/**
 * Perfil do usuário logado, ou null se não houver sessão.
 *
 * Nunca lança: é chamado pelo layout raiz, que envolve TODAS as páginas —
 * inclusive o login. Um erro aqui derrubaria a tela de login e deixaria o
 * usuário sem como entrar. Já aconteceu em produção, nos segundos em que a
 * Vercel ainda propagava as variáveis de ambiente para os nós de edge.
 */
export async function perfilAtual() {
  try {
    const supabase = clienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("perfis")
      .select("nome, funcao, admin, ativo")
      .eq("id", user.id)
      .maybeSingle();

    return data ? { ...data, email: user.email ?? "" } : null;
  } catch {
    // Sem perfil, a navegação aparece sem o nome do usuário. As páginas de
    // dados continuam falhando alto, como devem.
    return null;
  }
}
