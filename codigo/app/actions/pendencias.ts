"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase-servidor";

type Resultado = { ok: boolean; erro?: string };

/**
 * Resolver pendência da importação: lançador ou operador. Mesma regra de
 * quem pode corrigir o dado em si — quem só visualiza não encerra
 * pendência. Fail-safe: libera apenas para esses dois papéis explícitos.
 */
async function verificarPodeResolver() {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, erro: "Sem sessão ativa." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  const papel = (perfil as { papel?: string } | null)?.papel;
  if (papel !== "lancador" && papel !== "operador") {
    return { user: null, erro: "Seu perfil não pode resolver pendências." };
  }
  return { user, erro: null };
}

/**
 * Marca uma pendência da importação inicial como resolvida. Usa as colunas
 * `resolvida`, `resolvida_por` e `resolvida_em`, que existem desde a
 * migration 0003 e até agora nunca tinham sido usadas.
 */
export async function resolverPendencia(id: number): Promise<Resultado> {
  const { user, erro } = await verificarPodeResolver();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("importacao_pendencias")
    .update({
      resolvida: true,
      resolvida_por: user.id,
      resolvida_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/pendencias");
  return { ok: true };
}

export async function reabrirPendencia(id: number): Promise<Resultado> {
  const { user, erro } = await verificarPodeResolver();
  if (!user) return { ok: false, erro: erro ?? "Sem permissão." };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("importacao_pendencias")
    .update({ resolvida: false, resolvida_por: null, resolvida_em: null })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/pendencias");
  return { ok: true };
}
