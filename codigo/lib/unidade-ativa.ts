import { cookies } from "next/headers";

const COOKIE_UNIDADE_ATIVA = "unidade_ativa";

/**
 * Lê a unidade ativa do cookie, sem validar contra o que o usuário pode
 * realmente ver — só para exibição (ex: qual nome mostrar no seletor do
 * Nav). Toda escrita no banco valida de novo contra
 * `minhas_unidades_permitidas()` antes de usar — ver `resolverUnidadeEscrita`
 * em `app/actions/remanejamentos.ts` e `app/actions/admin.ts`.
 */
export function unidadeAtivaCookie(): number | null {
  const bruta = cookies().get(COOKIE_UNIDADE_ATIVA)?.value;
  const n = bruta ? Number(bruta) : null;
  return n && Number.isFinite(n) ? n : null;
}

export { COOKIE_UNIDADE_ATIVA };
