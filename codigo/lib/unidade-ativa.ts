import { cookies } from "next/headers";

const COOKIE_UNIDADE_ATIVA = "unidade_ativa";

/** "todas" = ver o consolidado de todas as unidades permitidas. */
export const TODAS_UNIDADES = "todas";

export type EscolhaUnidade = number | typeof TODAS_UNIDADES;

/**
 * Lê a unidade ativa do cookie, sem validar contra o que o usuário pode
 * realmente ver — só para saber o que foi escolhido. Quem consome valida:
 * a leitura em `unidadeAtivaLeitura()` (lib/dados.ts) e a escrita em
 * `resolverUnidadeEscrita()` (app/actions/remanejamentos.ts e admin.ts),
 * ambas conferindo contra `minhas_unidades_permitidas()` no banco.
 */
export function unidadeAtivaCookie(): EscolhaUnidade | null {
  const bruta = cookies().get(COOKIE_UNIDADE_ATIVA)?.value;
  if (!bruta) return null;
  if (bruta === TODAS_UNIDADES) return TODAS_UNIDADES;
  const n = Number(bruta);
  return n && Number.isFinite(n) ? n : null;
}

export { COOKIE_UNIDADE_ATIVA };
