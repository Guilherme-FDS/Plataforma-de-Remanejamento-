"use server";

import { revalidatePath } from "next/cache";
import { clienteAdmin } from "@/lib/supabase-admin";
import { clienteServidor } from "@/lib/supabase-servidor";

type Resultado = { ok: boolean; erro?: string };

export interface ResumoMfa {
  /** Perfis ativos, com e sem autenticador. */
  total: number;
  comFator: number;
  /** Nome de quem ainda não cadastrou — é a lista de quem ligar vai bloquear. */
  faltando: string[];
}

/**
 * Quem da equipe já cadastrou o segundo fator. Só admin.
 *
 * Precisa da service role: `auth.mfa_factors` não é legível pelo usuário
 * comum, e o `listUsers` administrativo já devolve os fatores de cada conta.
 */
export async function resumoMfa(): Promise<ResumoMfa | null> {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(meuPerfil as { admin?: boolean } | null)?.admin) return null;

  const admin = clienteAdmin();
  const [usuarios, perfis] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    supabase.from("perfis").select("id, nome, ativo"),
  ]);

  const ativos = ((perfis.data ?? []) as {
    id: string;
    nome: string;
    ativo: boolean;
  }[]).filter((p) => p.ativo);

  const comFatorIds = new Set(
    (usuarios.data?.users ?? [])
      .filter((u) =>
        (u.factors ?? []).some((f) => f.status === "verified"),
      )
      .map((u) => u.id),
  );

  const faltando = ativos
    .filter((p) => !comFatorIds.has(p.id))
    .map((p) => p.nome)
    .sort((a, b) => a.localeCompare(b));

  return {
    total: ativos.length,
    comFator: ativos.length - faltando.length,
    faltando,
  };
}

/**
 * Liga ou desliga a exigência de segundo fator para TODA a plataforma.
 *
 * Só admin. A checagem aqui é conveniência de interface — quem barra de
 * verdade é a policy `configuracoes_update` (migration 0012), que exige
 * `sou_admin()`.
 *
 * Ligar sem que todo mundo tenha cadastrado o autenticador tranca a equipe
 * do lado de fora dos dados (a tela de cadastro continua acessível). Por
 * isso a tela mostra quantas pessoas ainda faltam antes de deixar ligar.
 */
export async function definirMfaObrigatorio(valor: boolean): Promise<Resultado> {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sem sessão ativa." };

  const { error } = await supabase
    .from("configuracoes")
    .update({
      mfa_obrigatorio: valor,
      atualizado_em: new Date().toISOString(),
      atualizado_por: user.id,
    })
    .eq("id", true);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
