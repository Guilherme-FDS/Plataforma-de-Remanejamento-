"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase-servidor";
import { TODAS_UNIDADES, unidadeAtivaCookie } from "@/lib/unidade-ativa";

type SupabaseCliente = ReturnType<typeof clienteServidor>;

/**
 * Resolve em que unidade a ação escreve: a "unidade ativa" escolhida no
 * seletor do Nav, se o usuário realmente tiver acesso a ela — senão a
 * unidade de casa. Nunca confia cegamente no cookie: sempre revalida contra
 * `minhas_unidades_permitidas()` no banco antes de usar para escrita.
 *
 * No modo "todas as unidades" (consolidado) não há unidade de destino
 * óbvia, então a escrita cai para a unidade de casa.
 */
async function resolverUnidadeEscrita(
  supabase: SupabaseCliente,
  unidadeHome: number,
): Promise<number> {
  const idCookie = unidadeAtivaCookie();
  if (
    !idCookie ||
    idCookie === TODAS_UNIDADES ||
    idCookie === unidadeHome
  )
    return unidadeHome;

  const { data } = await supabase.rpc("minhas_unidades_permitidas");
  const permitidas = ((data ?? []) as { unidade_id: number }[]).map(
    (r) => r.unidade_id,
  );
  return permitidas.includes(idCookie) ? idCookie : unidadeHome;
}

async function carregarPerfil() {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, papel: null as string | null, unidadeId: 1 };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel, unidade_id")
    .eq("id", user.id)
    .maybeSingle();

  const p = perfil as { papel?: string; unidade_id?: number } | null;
  const unidadeId = await resolverUnidadeEscrita(supabase, p?.unidade_id ?? 1);

  return { user, papel: p?.papel ?? null, unidadeId };
}

/**
 * Cria e edita: lançador ou operador. Fail-safe — qualquer papel que não
 * seja explicitamente um desses dois fica sem permissão (visualizador,
 * papel nulo, leitura bloqueada). Bloquear só o "visualizador" literal
 * liberaria acesso por engano se a leitura do perfil falhasse.
 */
async function verificarPodeGerenciar() {
  const { user, papel, unidadeId } = await carregarPerfil();
  if (!user) return { user: null, unidadeId, erro: "Sem sessão ativa." };
  if (papel !== "lancador" && papel !== "operador") {
    return {
      user: null,
      unidadeId,
      erro: "Seu perfil não tem permissão para alterar dados.",
    };
  }
  return { user, unidadeId, erro: null };
}

/** Excluir: só operador — lançador cria/edita, mas não exclui. */
async function verificarPodeExcluir() {
  const { user, papel, unidadeId } = await carregarPerfil();
  if (!user) return { user: null, unidadeId, erro: "Sem sessão ativa." };
  if (papel !== "operador") {
    return {
      user: null,
      unidadeId,
      erro: "Só operadores podem excluir lançamentos.",
    };
  }
  return { user, unidadeId, erro: null };
}

export async function editarRemanejamento(
  id: number,
  dados: {
    setor: string;
    turno: string;
    supervisor: string | null;
    dataInicio: string;
    duracaoTipo: string;
    duracaoDias: number | null;
    causa: string | null;
    segmento: string;
    lateralidade: string | null;
    contraindicacao: string | null;
    tipo: string;
    profissional: string | null;
    observacoes: string | null;
  },
): Promise<{ ok: boolean; erro?: string }> {
  const { user, unidadeId, erro } = await verificarPodeGerenciar();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();

  // Filtrar por unidade não é opcional: duas unidades podem ter setores de
  // mesmo nome, e sem isso o maybeSingle() encontraria duas linhas e falharia.
  const [setorRes, turnoRes, segmentoRes] = await Promise.all([
    supabase.from("setores").select("id")
      .eq("nome", dados.setor).eq("unidade_id", unidadeId).maybeSingle(),
    supabase.from("turnos").select("id")
      .eq("nome", dados.turno).eq("unidade_id", unidadeId).maybeSingle(),
    supabase.from("segmentos").select("id")
      .eq("nome", dados.segmento).eq("unidade_id", unidadeId).maybeSingle(),
  ]);

  if (!setorRes.data) return { ok: false, erro: `Setor "${dados.setor}" não encontrado.` };
  if (!turnoRes.data) return { ok: false, erro: `Turno "${dados.turno}" não encontrado.` };
  if (!segmentoRes.data) return { ok: false, erro: `Segmento "${dados.segmento}" não encontrado.` };

  let supervisorId: number | null = null;
  let profissionalId: number | null = null;

  if (dados.supervisor) {
    const { data } = await supabase.from("supervisores").select("id")
      .eq("nome", dados.supervisor).eq("unidade_id", unidadeId).maybeSingle();
    supervisorId = data?.id ?? null;
  }
  if (dados.profissional) {
    const { data } = await supabase.from("profissionais").select("id")
      .eq("nome", dados.profissional).eq("unidade_id", unidadeId).maybeSingle();
    profissionalId = data?.id ?? null;
  }

  const { error } = await supabase
    .from("remanejamentos")
    .update({
      setor_id: setorRes.data.id,
      turno_id: turnoRes.data.id,
      supervisor_id: supervisorId,
      data_inicio: dados.dataInicio,
      duracao_tipo: dados.duracaoTipo,
      duracao_dias: dados.duracaoDias,
      tipo: dados.tipo,
      causa: dados.causa || null,
      segmento_id: segmentoRes.data.id,
      lado: dados.lateralidade || null,
      contraindicacao: dados.contraindicacao || null,
      observacoes: dados.observacoes || null,
      profissional_id: profissionalId,
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/");
  revalidatePath("/remanejamentos");
  revalidatePath("/colaboradores");

  return { ok: true };
}

export async function encerrarRemanejamento(
  id: number,
  dataEncerramento: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { user, erro } = await verificarPodeGerenciar();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("remanejamentos")
    .update({
      data_encerramento: dataEncerramento,
      encerrado_por: user.id,
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/");
  revalidatePath("/remanejamentos");
  revalidatePath("/colaboradores");

  return { ok: true };
}

export async function salvarRemanejamento(dados: {
  matricula: number | null;
  nome: string;
  setor: string;
  turno: string;
  supervisor: string | null;
  dataInicio: string;
  duracaoTipo: string;
  duracaoDias: number | null;
  causa: string | null;
  segmento: string;
  lateralidade: string | null;
  contraindicacao: string | null;
  tipo: string;
  profissional: string | null;
  observacoes: string | null;
}): Promise<{ ok: boolean; erro?: string; colaboradorId?: number }> {
  const { user, unidadeId, erro } = await verificarPodeGerenciar();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();

  // Resolve IDs de domínio em paralelo, sempre dentro da unidade de destino:
  // nomes podem se repetir entre unidades.
  const [setorRes, turnoRes, segmentoRes] = await Promise.all([
    supabase.from("setores").select("id")
      .eq("nome", dados.setor).eq("unidade_id", unidadeId).maybeSingle(),
    supabase.from("turnos").select("id")
      .eq("nome", dados.turno).eq("unidade_id", unidadeId).maybeSingle(),
    supabase.from("segmentos").select("id")
      .eq("nome", dados.segmento).eq("unidade_id", unidadeId).maybeSingle(),
  ]);

  if (!setorRes.data) return { ok: false, erro: `Setor "${dados.setor}" não encontrado.` };
  if (!turnoRes.data) return { ok: false, erro: `Turno "${dados.turno}" não encontrado.` };
  if (!segmentoRes.data) return { ok: false, erro: `Segmento "${dados.segmento}" não encontrado.` };

  let supervisorId: number | null = null;
  let profissionalId: number | null = null;

  if (dados.supervisor) {
    const { data } = await supabase
      .from("supervisores")
      .select("id")
      .eq("nome", dados.supervisor)
      .eq("unidade_id", unidadeId)
      .maybeSingle();
    supervisorId = data?.id ?? null;
  }

  if (dados.profissional) {
    const { data } = await supabase
      .from("profissionais")
      .select("id")
      .eq("nome", dados.profissional)
      .eq("unidade_id", unidadeId)
      .maybeSingle();
    profissionalId = data?.id ?? null;
  }

  // Encontra ou cria colaborador
  let colaboradorId: number;

  if (dados.matricula !== null) {
    // Mesma matrícula pode existir em unidades diferentes — a busca precisa
    // ficar dentro da unidade de destino.
    const { data: existente } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("matricula", dados.matricula)
      .eq("unidade_id", unidadeId)
      .maybeSingle();

    if (existente) {
      colaboradorId = existente.id;
    } else {
      const { data: novo, error: erroColab } = await supabase
        .from("colaboradores")
        .insert({
          matricula: dados.matricula,
          nome: dados.nome,
          setor_id: setorRes.data.id,
          turno_id: turnoRes.data.id,
          unidade_id: unidadeId,
        })
        .select("id")
        .single();
      if (erroColab || !novo)
        return { ok: false, erro: erroColab?.message ?? "Falha ao cadastrar colaborador." };
      colaboradorId = novo.id;
    }
  } else {
    const { data: novo, error: erroColab } = await supabase
      .from("colaboradores")
      .insert({
        matricula: null,
        nome: dados.nome,
        setor_id: setorRes.data.id,
        turno_id: turnoRes.data.id,
        unidade_id: unidadeId,
      })
      .select("id")
      .single();
    if (erroColab || !novo)
      return { ok: false, erro: erroColab?.message ?? "Falha ao cadastrar colaborador." };
    colaboradorId = novo.id;
  }

  // Insere o remanejamento
  const { error: erroRemanj } = await supabase.from("remanejamentos").insert({
    colaborador_id: colaboradorId,
    unidade_id: unidadeId,
    data_inicio: dados.dataInicio,
    duracao_tipo: dados.duracaoTipo,
    duracao_dias: dados.duracaoDias,
    setor_id: setorRes.data.id,
    turno_id: turnoRes.data.id,
    supervisor_id: supervisorId,
    tipo: dados.tipo,
    causa: dados.causa || null,
    segmento_id: segmentoRes.data.id,
    lado: dados.lateralidade || null,
    contraindicacao: dados.contraindicacao || null,
    observacoes: dados.observacoes || null,
    profissional_id: profissionalId,
    criado_por: user.id,
    origem: "sistema",
  });

  if (erroRemanj) return { ok: false, erro: erroRemanj.message };

  // Registra contraindicação como sugestão futura (upsert)
  if (dados.contraindicacao && segmentoRes.data.id) {
    await supabase.from("contraindicacoes_modelo").upsert(
      { segmento_id: segmentoRes.data.id, texto: dados.contraindicacao, usos: 1 },
      { onConflict: "segmento_id,texto", ignoreDuplicates: false },
    );
  }

  revalidatePath("/");
  revalidatePath("/remanejamentos");
  revalidatePath(`/colaboradores/${colaboradorId}`);

  return { ok: true, colaboradorId };
}

/**
 * Exclusão lógica — some das listas e indicadores, mas o registro continua
 * no banco (pode ser restaurado) e o trigger de auditoria já grava a
 * marcação como um UPDATE normal, com quem fez e quando.
 */
export async function excluirRemanejamento(
  id: number,
): Promise<{ ok: boolean; erro?: string }> {
  const { user, erro } = await verificarPodeExcluir();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("remanejamentos")
    .update({
      excluido: true,
      excluido_em: new Date().toISOString(),
      excluido_por: user.id,
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/");
  revalidatePath("/remanejamentos");
  revalidatePath("/colaboradores");

  return { ok: true };
}

export async function restaurarRemanejamento(
  id: number,
): Promise<{ ok: boolean; erro?: string }> {
  const { user, erro } = await verificarPodeExcluir();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("remanejamentos")
    .update({ excluido: false, excluido_em: null, excluido_por: null })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/");
  revalidatePath("/remanejamentos");
  revalidatePath("/colaboradores");

  return { ok: true };
}
