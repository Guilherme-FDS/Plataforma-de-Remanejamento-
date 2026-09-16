"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { clienteServidor } from "@/lib/supabase-servidor";
import {
  COOKIE_UNIDADE_ATIVA,
  TODAS_UNIDADES,
  type EscolhaUnidade,
} from "@/lib/unidade-ativa";

type Resultado = { ok: boolean; erro?: string };

async function verificarAdmin() {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, erro: "Sem sessão ativa." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("admin, ativo")
    .eq("id", user.id)
    .maybeSingle();

  const p = perfil as { admin?: boolean; ativo?: boolean } | null;
  if (!p?.admin || !p?.ativo) {
    return { user: null, erro: "Requer perfil de administrador." };
  }
  return { user, erro: null };
}

/** Cria uma unidade nova — nasce vazia, sem setores/turnos/etc. */
export async function criarUnidade(nome: string): Promise<Resultado> {
  const { user, erro } = await verificarAdmin();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase.from("unidades").insert({ nome: nome.trim() });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function editarUnidade(id: number, nome: string): Promise<Resultado> {
  const { user, erro } = await verificarAdmin();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase
    .from("unidades")
    .update({ nome: nome.trim() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleUnidade(id: number, ativo: boolean): Promise<Resultado> {
  const { user, erro } = await verificarAdmin();
  if (!user) return { ok: false, erro };
  const supabase = clienteServidor();
  const { error } = await supabase.from("unidades").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Troca a "unidade ativa" — o contexto em que a pessoa está trabalhando.
 * Define tanto o que ela enxerga quanto onde os lançamentos são gravados.
 *
 * Aceita o id de uma unidade ou `TODAS_UNIDADES` (consolidado, só faz
 * sentido para quem enxerga mais de uma). Valida contra
 * `minhas_unidades_permitidas()` antes de gravar o cookie: nunca confia no
 * valor vindo do cliente sem checar no banco.
 */
export async function definirUnidadeAtiva(
  escolha: EscolhaUnidade,
): Promise<Resultado> {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sem sessão ativa." };

  if (escolha !== TODAS_UNIDADES) {
    const { data, error } = await supabase.rpc("minhas_unidades_permitidas");
    if (error) return { ok: false, erro: error.message };

    const permitidas = ((data ?? []) as { unidade_id: number }[]).map(
      (r) => r.unidade_id,
    );
    if (!permitidas.includes(escolha)) {
      return { ok: false, erro: "Você não tem acesso a essa unidade." };
    }
  }

  cookies().set(COOKIE_UNIDADE_ATIVA, String(escolha), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/");
  return { ok: true };
}
