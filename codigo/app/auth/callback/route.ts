import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Estabelece sessão a partir de um link de e-mail do Supabase. Dois
 * formatos possíveis, e o link manda um ou outro — nunca os dois:
 *
 * - `?code=...` (PKCE): quando quem INICIA o fluxo é o próprio navegador
 *   — ex. "Esqueci a senha" em FormularioLogin, que gera e guarda o
 *   code_verifier antes de mandar o e-mail. `exchangeCodeForSession`.
 *
 * - `?token_hash=...&type=...`: quando quem inicia é o ADMIN, do servidor
 *   (convite de usuário novo, `inviteUserByEmail` em actions/usuarios.ts).
 *   Não existe navegador nenhum ali pra guardar um code_verifier — PKCE não
 *   se aplica. `verifyOtp` confere o token direto, sem depender de estado
 *   guardado antes.
 *
 * Só tratar `code` (como este arquivo fazia até 17/09) deixava todo convite
 * de usuário novo cair no fallback de erro sem avisar — o e-mail do
 * Supabase pro convite manda `token_hash`, nunca `code`.
 *
 * PRECISA que o template de e-mail "Invite user" no painel do Supabase
 * (Authentication → Email Templates) aponte pra cá com token_hash — ver
 * README de auth ou o comentário em app/actions/usuarios.ts.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (code || (tokenHash && type)) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) =>
            cs.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            ),
        },
      },
    );

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
