"use server";

import { revalidatePath } from "next/cache";
import { clienteAdmin } from "@/lib/supabase-admin";
import { clienteServidor } from "@/lib/supabase-servidor";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const REDIRECT_REDEFINIR = `${SITE_URL}/auth/callback?next=/auth/redefinir`;

async function verificarAdmin() {
  const supabase = clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, erro: "Sem sessão.", unidadeId: 1 };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("admin, unidade_id")
    .eq("id", user.id)
    .maybeSingle();

  const p = perfil as { admin?: boolean; unidade_id?: number } | null;
  if (!p?.admin)
    return { ok: false as const, erro: "Requer perfil de administrador.", unidadeId: 1 };

  return { ok: true as const, erro: null, unidadeId: p.unidade_id ?? 1 };
}

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome: string;
  funcao: string | null;
  papel: string;
  admin: boolean;
  ativo: boolean;
  confirmado: boolean;
  ultimoLogin: string | null;
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const check = await verificarAdmin();
  if (!check.ok) return [];

  const admin = clienteAdmin();
  const supabase = clienteServidor();

  const [usersRes, perfisRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    supabase.from("perfis").select("id, nome, funcao, papel, admin, ativo"),
  ]);

  const perfis = (perfisRes.data ?? []) as {
    id: string;
    nome: string;
    funcao: string | null;
    papel: string;
    admin: boolean;
    ativo: boolean;
  }[];

  return (usersRes.data?.users ?? []).map((u) => {
    const p = perfis.find((x) => x.id === u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      nome: p?.nome ?? "—",
      funcao: p?.funcao ?? null,
      papel: p?.papel ?? "operador",
      admin: p?.admin ?? false,
      ativo: p?.ativo ?? false,
      confirmado: !!u.email_confirmed_at,
      ultimoLogin: u.last_sign_in_at ?? null,
    };
  });
}

export async function criarUsuario(dados: {
  email: string;
  nome: string;
  funcao: string;
  papel: "operador" | "visualizador";
  admin: boolean;
}): Promise<{ ok: boolean; erro?: string }> {
  const check = await verificarAdmin();
  if (!check.ok) return { ok: false, erro: check.erro };

  const admin = clienteAdmin();

  // Cria o usuário e envia convite por e-mail automaticamente
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    dados.email.trim().toLowerCase(),
    { redirectTo: REDIRECT_REDEFINIR },
  );

  if (error || !data.user)
    return { ok: false, erro: error?.message ?? "Falha ao criar usuário." };

  const supabase = clienteServidor();
  const { error: erroP } = await supabase.from("perfis").insert({
    id: data.user.id,
    nome: dados.nome.trim(),
    funcao: dados.funcao,
    papel: dados.papel,
    admin: dados.admin,
    unidade_id: check.unidadeId,
  });

  if (erroP) {
    // Desfaz a criação do usuário no auth se o perfil falhou
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, erro: erroP.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function editarUsuario(
  id: string,
  dados: {
    nome: string;
    funcao: string;
    papel: string;
    admin: boolean;
  },
): Promise<{ ok: boolean; erro?: string }> {
  const check = await verificarAdmin();
  if (!check.ok) return { ok: false, erro: check.erro };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("perfis")
    .update({
      nome: dados.nome.trim(),
      funcao: dados.funcao,
      papel: dados.papel,
      admin: dados.admin,
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleUsuario(
  id: string,
  ativo: boolean,
): Promise<{ ok: boolean; erro?: string }> {
  const check = await verificarAdmin();
  if (!check.ok) return { ok: false, erro: check.erro };

  const supabase = clienteServidor();
  const { error } = await supabase
    .from("perfis")
    .update({ ativo })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function enviarLinkRedefinicao(
  email: string,
): Promise<{ ok: boolean; erro?: string }> {
  const check = await verificarAdmin();
  if (!check.ok) return { ok: false, erro: check.erro };

  const supabase = clienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: REDIRECT_REDEFINIR,
  });

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
