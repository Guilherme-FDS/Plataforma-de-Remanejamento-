"use server";

import { revalidatePath } from "next/cache";
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
 * Delega para `adesao_mfa()` (migration 0013), que lê `auth.mfa_factors`
 * como SECURITY DEFINER e devolve zero linha para quem não é admin.
 *
 * NÃO tente resolver isto com `auth.admin.listUsers()`: o campo `factors`
 * vem vazio na listagem (só `getUserById` o preenche), e o painel passa a
 * contar todo mundo como sem autenticador. Foi exatamente o bug que esta
 * função substitui.
 */
export async function resumoMfa(): Promise<ResumoMfa | null> {
  const supabase = clienteServidor();

  const { data, error } = await supabase.rpc("adesao_mfa");
  if (error) return null;

  const linhas = (data ?? []) as {
    id: string;
    nome: string;
    tem_fator: boolean;
  }[];

  // Sem linha nenhuma = não é admin. O painel simplesmente não aparece.
  if (linhas.length === 0) return null;

  const faltando = linhas
    .filter((l) => !l.tem_fator)
    .map((l) => l.nome)
    .sort((a, b) => a.localeCompare(b));

  return {
    total: linhas.length,
    comFator: linhas.length - faltando.length,
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
