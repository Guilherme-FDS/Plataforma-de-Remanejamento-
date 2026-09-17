/**
 * Camada de dados — ÚNICO ponto de acesso às informações.
 *
 * Todas as consultas passam pelo cliente com a sessão do usuário, então a RLS
 * do Postgres é quem decide o que volta. Sem login, tudo devolve vazio.
 */
import { cache } from "react";
import { registrarErroServidor } from "./registrarErro";
import { clienteServidor } from "./supabase-servidor";
import { TODAS_UNIDADES, unidadeAtivaCookie } from "./unidade-ativa";
import type {
  AlcanceUnidades,
  Colaborador,
  Listas,
  Papel,
  Pendencia,
  Remanejamento,
  Segmento,
  TipoRestricao,
  Unidade,
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
  matricula: number | null;
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
  possivel_duplicata_de: number | null;
  excluido: boolean;
  excluido_em: string | null;
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
    possivelDuplicataDe: l.possivel_duplicata_de,
    excluido: l.excluido,
    excluidoEm: l.excluido_em,
  };
}

/**
 * `cache` de-duplica a consulta dentro de uma mesma renderização: o Painel
 * chama isto várias vezes (indicadores, alertas, clusters) e só vai ao banco
 * uma vez.
 */
export const listarRemanejamentos = cache(
  async (incluirExcluidos = false): Promise<Remanejamento[]> => {
    const supabase = clienteServidor();
    const unidade = await unidadeAtivaLeitura();

    let query = supabase
      .from("vw_remanejamentos")
      .select("*")
      .order("data_inicio", { ascending: false });
    if (!incluirExcluidos) query = query.eq("excluido", false);
    if (unidade !== null) query = query.eq("unidade_id", unidade);

    const { data, error } = await query;

    if (error) throw new Error(`Falha ao ler remanejamentos: ${error.message}`);
    return (data as LinhaView[]).map(converter);
  },
);

/** Só os excluídos — usado na tela de restaurar. */
export const listarRemanejamentosExcluidos = cache(
  async (): Promise<Remanejamento[]> => {
    const supabase = clienteServidor();
    const unidade = await unidadeAtivaLeitura();

    let query = supabase
      .from("vw_remanejamentos")
      .select("*")
      .eq("excluido", true)
      .order("excluido_em", { ascending: false });
    if (unidade !== null) query = query.eq("unidade_id", unidade);

    const { data, error } = await query;

    if (error) throw new Error(`Falha ao ler excluídos: ${error.message}`);
    return (data as LinhaView[]).map(converter);
  },
);

export const listarColaboradores = cache(async (): Promise<Colaborador[]> => {
  const supabase = clienteServidor();
  const unidade = await unidadeAtivaLeitura();

  let query = supabase
    .from("colaboradores")
    .select("id, matricula, nome, setores(nome), turnos(nome)")
    .order("nome");
  if (unidade !== null) query = query.eq("unidade_id", unidade);

  const { data, error } = await query;

  if (error) throw new Error(`Falha ao ler colaboradores: ${error.message}`);

  return (data ?? []).map((c) => {
    const linha = c as unknown as {
      id: number;
      matricula: number | null;
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
  const unidade = await unidadeAtivaLeitura();
  // Objeto vazio quando não há unidade ativa: `.match({})` não filtra nada.
  const naUnidade = unidade !== null ? { unidade_id: unidade } : {};

  const [setores, turnos, supervisores, profissionais, segmentos] =
    await Promise.all([
      supabase
        .from("setores")
        .select("nome")
        .eq("ativo", true)
        .match(naUnidade)
        .order("nome"),
      supabase.from("turnos").select("nome").match(naUnidade).order("nome"),
      supabase
        .from("supervisores")
        .select("nome")
        .eq("ativo", true)
        .match(naUnidade)
        .order("nome"),
      supabase
        .from("profissionais")
        .select("nome")
        .eq("ativo", true)
        .match(naUnidade)
        .order("nome"),
      supabase
        .from("segmentos")
        .select("nome, regioes_corporais(nome)")
        .eq("ativo", true)
        .match(naUnidade)
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

/**
 * Busca pelo id interno diretamente — não carrega todos os colaboradores.
 */
export async function obterColaborador(
  id: number,
): Promise<Colaborador | undefined> {
  const supabase = clienteServidor();
  const unidade = await unidadeAtivaLeitura();

  let query = supabase
    .from("colaboradores")
    .select("id, matricula, nome, setores(nome), turnos(nome)")
    .eq("id", id);
  if (unidade !== null) query = query.eq("unidade_id", unidade);

  const { data } = await query.maybeSingle();

  if (!data) return undefined;

  const linha = data as unknown as {
    id: number;
    matricula: number | null;
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
}

/** Busca um remanejamento pelo id para pré-preencher o formulário de edição. */
export async function obterRemanejamento(
  id: number,
): Promise<Remanejamento | undefined> {
  const supabase = clienteServidor();
  const unidade = await unidadeAtivaLeitura();

  let query = supabase.from("vw_remanejamentos").select("*").eq("id", id);
  if (unidade !== null) query = query.eq("unidade_id", unidade);

  const { data, error } = await query.maybeSingle();

  if (error || !data) return undefined;
  return converter(data as LinhaView);
}

/** Busca o histórico de um colaborador diretamente pelo id — não carrega tudo. */
export async function historicoDoColaborador(
  id: number,
): Promise<Remanejamento[]> {
  const supabase = clienteServidor();
  const unidade = await unidadeAtivaLeitura();

  let query = supabase
    .from("vw_remanejamentos")
    .select("*")
    .eq("colaborador_id", id)
    .eq("excluido", false)
    .order("data_inicio", { ascending: false });
  if (unidade !== null) query = query.eq("unidade_id", unidade);

  const { data, error } = await query;

  if (error) throw new Error(`Falha ao ler histórico: ${error.message}`);
  return (data as LinhaView[]).map(converter);
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

export interface ItemLista {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface SegmentoAdmin extends ItemLista {
  regiao: string;
  regiaoId: number;
}

/** `efetivo` habilita incidência por 100 colaboradores nos indicadores. */
export interface SetorAdmin extends ItemLista {
  efetivo: number | null;
}

export interface ListasAdmin {
  setores: SetorAdmin[];
  turnos: ItemLista[];
  supervisores: ItemLista[];
  profissionais: ItemLista[];
  regioes: ItemLista[];
  segmentos: SegmentoAdmin[];
}

export const obterListasAdmin = cache(async (): Promise<ListasAdmin> => {
  const supabase = clienteServidor();
  const unidade = await unidadeAtivaLeitura();
  const naUnidade = unidade !== null ? { unidade_id: unidade } : {};

  const [setores, turnos, supervisores, profissionais, regioes, segmentos] =
    await Promise.all([
      supabase
        .from("setores")
        .select("id, nome, ativo, efetivo")
        .match(naUnidade)
        .order("nome"),
      supabase.from("turnos").select("id, nome").match(naUnidade).order("nome"),
      supabase
        .from("supervisores")
        .select("id, nome, ativo")
        .match(naUnidade)
        .order("nome"),
      supabase
        .from("profissionais")
        .select("id, nome, ativo")
        .match(naUnidade)
        .order("nome"),
      supabase
        .from("regioes_corporais")
        .select("id, nome")
        .match(naUnidade)
        .order("nome"),
      supabase
        .from("segmentos")
        .select("id, nome, ativo, regioes_corporais(id, nome)")
        .match(naUnidade)
        .order("nome"),
    ]);

  const mapItem = (r: { data: { id: number; nome: string; ativo?: boolean }[] | null }) =>
    (r.data ?? []).map((x) => ({ id: x.id, nome: x.nome, ativo: x.ativo ?? true }));

  const segs: SegmentoAdmin[] = (segmentos.data ?? []).map((s) => {
    const linha = s as unknown as {
      id: number;
      nome: string;
      ativo: boolean;
      regioes_corporais: { id: number; nome: string } | null;
    };
    return {
      id: linha.id,
      nome: linha.nome,
      ativo: linha.ativo,
      regiao: linha.regioes_corporais?.nome ?? "—",
      regiaoId: linha.regioes_corporais?.id ?? 0,
    };
  });

  const setoresComEfetivo: SetorAdmin[] = (setores.data ?? []).map((s) => {
    const linha = s as unknown as {
      id: number;
      nome: string;
      ativo: boolean;
      efetivo: number | null;
    };
    return { id: linha.id, nome: linha.nome, ativo: linha.ativo, efetivo: linha.efetivo };
  });

  return {
    setores: setoresComEfetivo,
    turnos: mapItem(turnos),
    supervisores: mapItem(supervisores),
    profissionais: mapItem(profissionais),
    regioes: mapItem(regioes),
    segmentos: segs,
  };
});

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
      .select("nome, funcao, admin, ativo, papel, alcance_unidades, unidade_id")
      .eq("id", user.id)
      .maybeSingle();

    return data
      ? {
          ...(data as {
            nome: string;
            funcao: string;
            admin: boolean;
            ativo: boolean;
            papel: Papel;
            alcance_unidades: AlcanceUnidades;
            unidade_id: number | null;
          }),
          email: user.email ?? "",
        }
      : null;
  } catch (erro) {
    // Sem perfil, a navegação aparece sem o nome do usuário. As páginas de
    // dados continuam falhando alto, como devem. Mas o erro precisa ficar
    // visível — engolir em silêncio faz uma falha de configuração (env var
    // errada, projeto Supabase trocado) parecer "usuário deslogado" e
    // atrasa o diagnóstico, como aconteceu no incidente de 17/09.
    await registrarErroServidor("perfilAtual", erro);
    return null;
  }
}

/** Todas as unidades cadastradas — leitura livre para toda a equipe ativa. */
export const listarTodasUnidades = cache(async (): Promise<Unidade[]> => {
  const supabase = clienteServidor();
  const { data, error } = await supabase
    .from("unidades")
    .select("id, nome, ativo")
    .order("nome");
  if (error) throw new Error(`Falha ao ler unidades: ${error.message}`);
  return data ?? [];
});

/**
 * Unidades que o usuário logado pode ver — considera alcance_unidades
 * (própria / todas / específicas liberadas). Usado no seletor de unidade
 * ativa e para validar trocas.
 *
 * Nunca lança, pelo mesmo motivo de `perfilAtual()`: é chamado pelo layout
 * raiz, que envolve TODAS as páginas. Um erro aqui (banco fora do ar,
 * migration ainda não aplicada) derrubaria o app inteiro em vez de só
 * esconder o seletor de unidade.
 */
export const listarUnidadesPermitidas = cache(async (): Promise<Unidade[]> => {
  try {
    const supabase = clienteServidor();
    const { data, error } = await supabase.rpc(
      "minhas_unidades_permitidas_detalhe",
    );
    if (error) return [];
    return ((data ?? []) as { id: number; nome: string }[]).map((u) => ({
      ...u,
      ativo: true,
    }));
  } catch {
    return [];
  }
});

/**
 * Unidade que filtra TODA a leitura de dados — o "onde eu estou" do
 * seletor no Nav. Devolve `null` quando a escolha é o consolidado de
 * todas as unidades (aí nenhuma consulta filtra, e a RLS sozinha decide).
 *
 * Sem isto, um gestor com alcance "todas" via os dados de todas as
 * unidades somados o tempo inteiro, e trocar de unidade no seletor não
 * mudava nada na tela.
 *
 * Nunca confia no cookie: só aceita unidade que o banco confirma como
 * permitida. Cookie inválido ou acesso revogado cai para a unidade de casa.
 */
export const unidadeAtivaLeitura = cache(async (): Promise<number | null> => {
  const escolha = unidadeAtivaCookie();
  if (escolha === TODAS_UNIDADES) return null;

  const permitidas = await listarUnidadesPermitidas();
  if (permitidas.length === 0) return null;

  if (typeof escolha === "number" && permitidas.some((u) => u.id === escolha)) {
    return escolha;
  }

  const perfil = await perfilAtual();
  const casa = perfil?.unidade_id ?? null;
  if (casa && permitidas.some((u) => u.id === casa)) return casa;

  return permitidas[0].id;
});

/** Unidades extras liberadas para um perfil específico (alcance = 'especificas'). */
export async function listarUnidadesExtrasDe(
  perfilId: string,
): Promise<number[]> {
  const supabase = clienteServidor();
  const { data, error } = await supabase
    .from("perfil_unidades_extra")
    .select("unidade_id")
    .eq("perfil_id", perfilId);
  if (error) throw new Error(`Falha ao ler unidades extras: ${error.message}`);
  return (data ?? []).map((r) => r.unidade_id as number);
}
