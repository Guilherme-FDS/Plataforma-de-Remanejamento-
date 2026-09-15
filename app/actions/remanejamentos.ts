"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase-servidor";

async function verificarOperador() {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, unidadeId: 1, erro: "Sem sessão ativa." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel, unidade_id")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.papel === "visualizador") {
    return { user: null, unidadeId: 1, erro: "Você tem perfil de visualizador — sem permissão para alterar dados." };
  }

  return { user, unidadeId: (perfil as { unidade_id?: number } | null)?.unidade_id ?? 1, erro: null };
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
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();

  const [setorRes, turnoRes, segmentoRes] = await Promise.all([
    supabase.from("setores").select("id").eq("nome", dados.setor).maybeSingle(),
    supabase.from("turnos").select("id").eq("nome", dados.turno).maybeSingle(),
    supabase.from("segmentos").select("id").eq("nome", dados.segmento).maybeSingle(),
  ]);

  if (!setorRes.data) return { ok: false, erro: `Setor "${dados.setor}" não encontrado.` };
  if (!turnoRes.data) return { ok: false, erro: `Turno "${dados.turno}" não encontrado.` };
  if (!segmentoRes.data) return { ok: false, erro: `Segmento "${dados.segmento}" não encontrado.` };

  let supervisorId: number | null = null;
  let profissionalId: number | null = null;

  if (dados.supervisor) {
    const { data } = await supabase.from("supervisores").select("id").eq("nome", dados.supervisor).maybeSingle();
    supervisorId = data?.id ?? null;
  }
  if (dados.profissional) {
    const { data } = await supabase.from("profissionais").select("id").eq("nome", dados.profissional).maybeSingle();
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
  const { user, erro } = await verificarOperador();
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
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();

  // Resolve IDs de domínio em paralelo
  const [setorRes, turnoRes, segmentoRes] = await Promise.all([
    supabase.from("setores").select("id").eq("nome", dados.setor).maybeSingle(),
    supabase.from("turnos").select("id").eq("nome", dados.turno).maybeSingle(),
    supabase
      .from("segmentos")
      .select("id")
      .eq("nome", dados.segmento)
      .maybeSingle(),
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
      .maybeSingle();
    supervisorId = data?.id ?? null;
  }

  if (dados.profissional) {
    const { data } = await supabase
      .from("profissionais")
      .select("id")
      .eq("nome", dados.profissional)
      .maybeSingle();
    profissionalId = data?.id ?? null;
  }

  // Encontra ou cria colaborador
  let colaboradorId: number;

  if (dados.matricula !== null) {
    const { data: existente } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("matricula", dados.matricula)
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
