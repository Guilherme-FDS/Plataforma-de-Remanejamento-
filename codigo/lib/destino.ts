/**
 * Só aceita caminho interno ("/algo"). Barra dupla ("//site.com") ou
 * barra invertida ("/\site.com") o navegador trata como outro domínio —
 * seria redirecionamento aberto para phishing.
 */
export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/")) return "/";
  if (valor.startsWith("//") || valor.startsWith("/\\")) return "/";
  return valor;
}
