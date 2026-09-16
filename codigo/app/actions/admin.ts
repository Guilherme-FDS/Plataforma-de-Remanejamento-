"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase-servidor";
import { TODAS_UNIDADES, unidadeAtivaCookie } from "@/lib/unidade-ativa";

type SupabaseCliente = ReturnType<typeof clienteServidor>;

/** Ver nota completa em actions/remanejamentos.ts — mesma lógica. */
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

/**
 * As listas de configuração (setores, turnos, segmentos, etc.) ficam
 * restritas a operador — mais estrutural que um lançamento avulso.
 * Fail-safe: só libera para o papel explicitamente igual a "operador".
 */
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

  const p = perfil as { papel?: string; unidade_id?: number } | null;

  if (p?.papel !== "operador") {
    return { user: null, unidadeId: 1, erro: "Sem permissão." };
  }

  const unidadeId = await resolverUnidadeEscrita(supabase, p.unidade_id ?? 1);
  return { user, unidadeId, erro: null };
}

type Resultado = { ok: boolean; erro?: string };

// ─── Setores ────────────────────────────────────────────────────────────────

export async function criarSetor(nome: string): Promise<Resultado> {
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("setores")
    .insert({ nome: nome.trim(), unidade_id: unidadeId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarSetor(id: number, nome: string): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("setores")
    .update({ nome: nome.trim() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleSetor(id: number, ativo: boolean): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase.from("setores").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Turnos ─────────────────────────────────────────────────────────────────

export async function criarTurno(nome: string): Promise<Resultado> {
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("turnos")
    .insert({ nome: nome.trim(), unidade_id: unidadeId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarTurno(id: number, nome: string): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("turnos")
    .update({ nome: nome.trim() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Supervisores ────────────────────────────────────────────────────────────

export async function criarSupervisor(nome: string): Promise<Resultado> {
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("supervisores")
    .insert({ nome: nome.trim(), unidade_id: unidadeId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarSupervisor(id: number, nome: string): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("supervisores")
    .update({ nome: nome.trim() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleSupervisor(id: number, ativo: boolean): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase.from("supervisores").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Profissionais ───────────────────────────────────────────────────────────

export async function criarProfissional(nome: string): Promise<Resultado> {
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("profissionais")
    .insert({ nome: nome.trim(), unidade_id: unidadeId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarProfissional(id: number, nome: string): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("profissionais")
    .update({ nome: nome.trim() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleProfissional(id: number, ativo: boolean): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase.from("profissionais").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Regiões do corpo ────────────────────────────────────────────────────────

export async function criarRegiao(nome: string): Promise<Resultado> {
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("regioes_corporais")
    .insert({ nome: nome.trim(), unidade_id: unidadeId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarRegiao(id: number, nome: string): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("regioes_corporais")
    .update({ nome: nome.trim() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Segmentos ───────────────────────────────────────────────────────────────

export async function criarSegmento(
  nome: string,
  regiaoId: number,
): Promise<Resultado> {
  const { user, unidadeId, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("segmentos")
    .insert({ nome: nome.trim(), regiao_id: regiaoId, unidade_id: unidadeId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarSegmento(
  id: number,
  nome: string,
  regiaoId: number,
): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("segmentos")
    .update({ nome: nome.trim(), regiao_id: regiaoId })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleSegmento(id: number, ativo: boolean): Promise<Resultado> {
  const { user, erro } = await verificarOperador();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase.from("segmentos").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
