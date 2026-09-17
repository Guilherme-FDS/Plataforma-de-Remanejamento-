"use server";

import { revalidatePath } from "next/cache";
import { clienteAdmin } from "@/lib/supabase-admin";
import { clienteServidor } from "@/lib/supabase-servidor";
import type { AlcanceUnidades, Papel } from "@/lib/tipos";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Usada por `criarUsuario()` (convite) e `enviarLinkRedefinicao()` — as
 * duas são chamadas de ADMIN (servidor), sem navegador nenhum iniciando o
 * fluxo. Por isso o e-mail do Supabase manda `token_hash`, não `code`; ver
 * o comentário completo em app/auth/callback/route.ts.
 *
 * PRECISA que o template "Invite user" (e "Reset Password", se
 * `enviarLinkRedefinicao` também for usada) em Authentication → Email
 * Templates do painel do Supabase aponte pra cá com token_hash, algo como:
 *
 *   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/redefinir
 *
 * (troque `type=invite` por `type=recovery` no template de Reset Password.)
 * Sem esse ajuste no template, o link continua vindo no formato antigo
 * (fragmento da URL) e cai sempre em /login sem avisar.
 */
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
  papel: Papel;
  admin: boolean;
  ativo: boolean;
  confirmado: boolean;
  ultimoLogin: string | null;
  unidadeId: number | null;
  unidadeNome: string | null;
  alcanceUnidades: AlcanceUnidades;
  unidadesExtra: number[];
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const check = await verificarAdmin();
  if (!check.ok) return [];

  const admin = clienteAdmin();
  const supabase = clienteServidor();

  const [usersRes, perfisRes, unidadesRes, extrasRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    supabase
      .from("perfis")
      .select("id, nome, funcao, papel, admin, ativo, unidade_id, alcance_unidades"),
    supabase.from("unidades").select("id, nome"),
    supabase.from("perfil_unidades_extra").select("perfil_id, unidade_id"),
  ]);

  const perfis = (perfisRes.data ?? []) as {
    id: string;
    nome: string;
    funcao: string | null;
    papel: Papel;
    admin: boolean;
    ativo: boolean;
    unidade_id: number | null;
    alcance_unidades: AlcanceUnidades;
  }[];

  const unidades = (unidadesRes.data ?? []) as { id: number; nome: string }[];
  const extras = (extrasRes.data ?? []) as {
    perfil_id: string;
    unidade_id: number;
  }[];

  return (usersRes.data?.users ?? []).map((u) => {
    const p = perfis.find((x) => x.id === u.id);
    const unidadeNome = unidades.find((un) => un.id === p?.unidade_id)?.nome ?? null;
    const unidadesExtra = extras
      .filter((e) => e.perfil_id === u.id)
      .map((e) => e.unidade_id);

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
      unidadeId: p?.unidade_id ?? null,
      unidadeNome,
      alcanceUnidades: p?.alcance_unidades ?? "propria",
      unidadesExtra,
    };
  });
}

async function gravarUnidadesExtra(
  perfilId: string,
  alcanceUnidades: AlcanceUnidades,
  unidadesExtras: number[],
) {
  const supabase = clienteServidor();
  await supabase.from("perfil_unidades_extra").delete().eq("perfil_id", perfilId);
  if (alcanceUnidades === "especificas" && unidadesExtras.length > 0) {
    await supabase.from("perfil_unidades_extra").insert(
      unidadesExtras.map((unidadeId) => ({
        perfil_id: perfilId,
        unidade_id: unidadeId,
      })),
    );
  }
}

export async function criarUsuario(dados: {
  email: string;
  nome: string;
  funcao: string;
  papel: Papel;
  admin: boolean;
  unidadeId: number;
  alcanceUnidades: AlcanceUnidades;
  unidadesExtras: number[];
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
    unidade_id: dados.unidadeId,
    alcance_unidades: dados.alcanceUnidades,
  });

  if (erroP) {
    // Desfaz a criação do usuário no auth se o perfil falhou
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, erro: erroP.message };
  }

  await gravarUnidadesExtra(data.user.id, dados.alcanceUnidades, dados.unidadesExtras);

  revalidatePath("/admin");
  return { ok: true };
}

export async function editarUsuario(
  id: string,
  dados: {
    nome: string;
    funcao: string;
    papel: Papel;
    admin: boolean;
    unidadeId: number;
    alcanceUnidades: AlcanceUnidades;
    unidadesExtras: number[];
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
      unidade_id: dados.unidadeId,
      alcance_unidades: dados.alcanceUnidades,
    })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  await gravarUnidadesExtra(id, dados.alcanceUnidades, dados.unidadesExtras);

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
