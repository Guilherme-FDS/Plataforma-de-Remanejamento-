import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HEADER_CAMINHO } from "@/lib/caminho";

/**
 * Renova a sessão a cada requisição e barra quem não está logado.
 *
 * A proteção de verdade é a RLS no Postgres — sem sessão, toda consulta
 * devolve vazio. Este middleware existe para o usuário ver a tela de login
 * em vez de um painel vazio sem explicação.
 */
export async function middleware(request: NextRequest) {
  // Cópia, não mutação: os headers de NextRequest são somente leitura, e a
  // forma suportada de repassar um header ao servidor é recriar o objeto.
  const cabecalhos = new Headers(request.headers);
  cabecalhos.set(HEADER_CAMINHO, request.nextUrl.pathname);

  const nonce = criarNonce();
  cabecalhos.set("x-nonce", nonce);

  let resposta = NextResponse.next({ request: { headers: cabecalhos } });
  aplicarHeadersSeguranca(resposta, nonce);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem as variáveis, deixa passar em vez de derrubar toda requisição do
  // site. Não abre brecha: sem credencial o app não consulta nada, e quem
  // guarda os dados é a RLS, não este middleware.
  if (!url || !chave) return resposta;

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(paraGravar) {
        for (const { name, value } of paraGravar) {
          request.cookies.set(name, value);
        }
        // Reconstrói a partir de request.headers: `request.cookies.set()`
        // escreve de volta no header `cookie`, e a cópia feita lá em cima é
        // anterior a essa escrita — usá-la aqui entregaria a sessão velha.
        const atualizados = new Headers(request.headers);
        atualizados.set(HEADER_CAMINHO, request.nextUrl.pathname);
        atualizados.set("x-nonce", nonce);
        resposta = NextResponse.next({ request: { headers: atualizados } });
        aplicarHeadersSeguranca(resposta, nonce);
        for (const { name, value, options } of paraGravar) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalida o token no servidor. Não troque por getSession(),
  // que confia no cookie sem verificar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehLogin = caminho.startsWith("/login");
  const ehAuth = caminho.startsWith("/auth/");

  if (!user && !ehLogin && !ehAuth) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("de", caminho);
    const redirecionamento = NextResponse.redirect(destino);
    aplicarHeadersSeguranca(redirecionamento, nonce);
    return redirecionamento;
  }

  if (user && ehLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    const redirecionamento = NextResponse.redirect(destino);
    aplicarHeadersSeguranca(redirecionamento, nonce);
    return redirecionamento;
  }

  return resposta;
}

/** Um valor novo por requisição — é o que faz o CSP liberar só o script que o próprio Next gerou nesta resposta, e recusar qualquer outro injetado. */
function criarNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Headers que não protegem dado (isso é a RLS) mas fecham golpes de
 * navegador: clickjacking, MIME sniffing, vazamento de URL por referrer, e
 * XSS via injeção de script que a CSP barra mesmo que passe pela validação
 * de formulário.
 *
 * CSP com nonce em vez de 'unsafe-inline' no script-src: o Next.js App
 * Router injeta alguns scripts inline pra streaming/Suspense, e eles
 * assumem automaticamente o nonce desta resposta — não precisa tocar nos
 * componentes. `style-src` mantém 'unsafe-inline' porque nonce não vale
 * para atributo `style=""` (só para tag `<style>`), e a tela de
 * Indicadores usa `style` inline pra altura de barra proporcional.
 */
function aplicarHeadersSeguranca(resposta: NextResponse, nonce: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self' ${supabaseUrl};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  resposta.headers.set("Content-Security-Policy", csp);
  resposta.headers.set("X-Frame-Options", "DENY");
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  resposta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resposta.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
