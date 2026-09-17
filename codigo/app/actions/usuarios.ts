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
 * fluxo. Nesse caso o Supabase devolve os tokens no **fragmento** da URL
 * (`#access_token=...`), formato que só o navegador enxerga.
 *
 * Por isso aponta direto pra PÁGINA `/auth/redefinir`, e não pra rota de
 * servidor `/auth/callback`: rota de servidor nunca recebe fragmento, e
 * era exatamente por isso que todo convite caía na tela de login (bug de
 * 17/09). A página lê o token pelo próprio cliente do Supabase.
 *
 * Isso dispensa SMTP próprio e edição do template de e-mail — o template
 * padrão do Supabase funciona como está.
 *
 * Só exige que `<SITE_URL>/auth/redefinir` esteja liberado em
 * Authentication → URL Configuration → Redirect URLs, no painel.
 */
const REDIRECT_REDEFINIR = `${SITE_URL}/auth/redefinir`;

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

export interface ResultadoCriacao {
  ok: boolean;
  erro?: string;
  /**
   * Link para a pessoa definir a senha, para o admin repassar por outro
   * canal (WhatsApp, e-mail corporativo). Vem junto do convite por e-mail,
   * não no lugar dele — é uma segunda via, útil quando o e-mail demora,
   * cai no spam ou esbarra no limite de envio do Supabase.
   */
  link?: string | null;
  /** false = o e-mail não saiu (limite de envio); o link vira o único caminho. */
  emailEnviado?: boolean;
}

/**
 * O GoTrue não expõe um código de erro estável para "limite de e-mail
 * estourado", só a mensagem. Reconhecer pela mensagem é frágil, então o
 * fail-safe é o contrário do usual: na dúvida, NÃO trata como problema de
 * e-mail e devolve o erro original ao admin, em vez de criar um usuário
 * que ele não esperava.
 */
function ehErroDeEnvioDeEmail(mensagem: string | undefined): boolean {
  if (!mensagem) return false;
  return /rate limit|email rate|sending email|smtp|failed to send/i.test(mensagem);
}

/**
 * Link de definição de senha, gerado SEM disparar e-mail nenhum
 * (`generateLink` só devolve o endereço; quem envia é quem chamou).
 *
 * Usa `recovery` e não `invite` de propósito: `invite` recusa quando o
 * usuário já existe, e neste ponto ele acabou de ser criado. Os dois caem
 * na mesma tela `/auth/redefinir`.
 *
 * Nunca lança: o link é um extra: se falhar, o convite por e-mail já foi.
 */
async function gerarLinkDefinicaoSenha(email: string): Promise<string | null> {
  try {
    const admin = clienteAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: REDIRECT_REDEFINIR },
    });
    if (error) return null;
    return data.properties?.action_link ?? null;
  } catch {
    return null;
  }
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
}): Promise<ResultadoCriacao> {
  const check = await verificarAdmin();
  if (!check.ok) return { ok: false, erro: check.erro };

  const admin = clienteAdmin();
  const email = dados.email.trim().toLowerCase();

  // Caminho principal, inalterado: cria o usuário e o Supabase dispara o
  // e-mail de convite.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: REDIRECT_REDEFINIR,
  });

  let usuario = data?.user ?? null;
  let emailEnviado = true;

  if (error || !usuario) {
    /*
     * O serviço de e-mail padrão do Supabase é limitado a poucos envios por
     * hora. Quando ele recusa, `inviteUserByEmail` falha inteira e o usuário
     * NÃO chega a ser criado — o admin fica travado sem conseguir cadastrar
     * ninguém por causa de um limite de e-mail.
     *
     * Aqui o cadastro deixa de depender do e-mail: cria o usuário direto e
     * devolve o link para o admin repassar por outro canal (WhatsApp,
     * e-mail corporativo). `email_confirm` já vem verdadeiro porque quem
     * cadastrou foi um administrador, que responde pelo endereço.
     */
    if (!ehErroDeEnvioDeEmail(error?.message)) {
      return { ok: false, erro: error?.message ?? "Falha ao criar usuário." };
    }

    const { data: criado, error: erroCriacao } =
      await admin.auth.admin.createUser({ email, email_confirm: true });

    if (erroCriacao || !criado.user) {
      return {
        ok: false,
        erro: erroCriacao?.message ?? "Falha ao criar usuário.",
      };
    }

    usuario = criado.user;
    emailEnviado = false;
  }

  const supabase = clienteServidor();
  const { error: erroP } = await supabase.from("perfis").insert({
    id: usuario.id,
    nome: dados.nome.trim(),
    funcao: dados.funcao,
    papel: dados.papel,
    admin: dados.admin,
    unidade_id: dados.unidadeId,
    alcance_unidades: dados.alcanceUnidades,
  });

  if (erroP) {
    // Desfaz a criação do usuário no auth se o perfil falhou
    await admin.auth.admin.deleteUser(usuario.id);
    return { ok: false, erro: erroP.message };
  }

  await gravarUnidadesExtra(usuario.id, dados.alcanceUnidades, dados.unidadesExtras);

  revalidatePath("/admin");
  return { ok: true, link: await gerarLinkDefinicaoSenha(email), emailEnviado };
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
): Promise<ResultadoCriacao> {
  const check = await verificarAdmin();
  if (!check.ok) return { ok: false, erro: check.erro };

  const supabase = clienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: REDIRECT_REDEFINIR,
  });

  // Mesma ideia de `criarUsuario()`: o e-mail continua sendo o caminho
  // principal, mas o link volta junto para o admin ter uma segunda via —
  // e, se o e-mail esbarrou no limite de envio, continua sendo possível
  // desbloquear a pessoa pelo WhatsApp em vez de esperar a cota virar.
  const link = await gerarLinkDefinicaoSenha(email);

  if (error) {
    if (!ehErroDeEnvioDeEmail(error.message) || !link) {
      return { ok: false, erro: error.message };
    }
    return { ok: true, link, emailEnviado: false };
  }

  return { ok: true, link, emailEnviado: true };
}
