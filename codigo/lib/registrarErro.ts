/**
 * Observabilidade mínima (migration 0015). Não é Sentry — não agrega, não
 * alerta, não tem retenção configurável. É o suficiente pra uma falha como
 * a do incidente de MFA de 17/09 (perfilAtual()/estadoMfa() engolindo erro
 * em silêncio) aparecer pro admin sem precisar vasculhar log da Vercel.
 *
 * Sempre best-effort: nunca lança, nunca atrasa quem chamou. Loga no
 * console de qualquer forma — a gravação em `erros_aplicacao` é bônus, não
 * substituição.
 */
import { clienteServidor } from "./supabase-servidor";

export async function registrarErroServidor(
  contexto: string,
  erro: unknown,
  rota?: string,
): Promise<void> {
  console.error(`${contexto}:`, erro);

  try {
    const supabase = clienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("erros_aplicacao").insert({
      contexto,
      mensagem: erro instanceof Error ? erro.message : String(erro),
      usuario_id: user?.id ?? null,
      rota: rota ?? null,
    });
  } catch {
    // O log em si falhando (env var ausente, RLS, rede) não pode derrubar
    // o catch original — quem chamou já está lidando com um fallback seguro.
  }
}
