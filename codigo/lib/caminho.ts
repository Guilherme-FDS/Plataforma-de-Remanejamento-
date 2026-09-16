/**
 * Cabeçalho com o caminho da requisição, gravado pelo middleware e lido pelo
 * layout raiz.
 *
 * Server Component não enxerga a URL. O bloqueio de MFA precisa saber em que
 * rota está para não cobrir a própria tela de cadastro do segundo fator —
 * senão a pessoa fica presa num aviso que aponta para uma página que o aviso
 * esconde.
 *
 * Fica em arquivo próprio porque o middleware roda no edge: importar do
 * layout (que puxa `next/headers` e o cliente Supabase de servidor) para
 * dentro dele arrastaria código que não roda lá.
 */
export const HEADER_CAMINHO = "x-caminho";
