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

  let resposta = NextResponse.next({ request: { headers: cabecalhos } });

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
        resposta = NextResponse.next({ request: { headers: atualizados } });
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
    return NextResponse.redirect(destino);
  }

  if (user && ehLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
