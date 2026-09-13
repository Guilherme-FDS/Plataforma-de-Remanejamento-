import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { credenciais } from "./supabase-credenciais";

/**
 * Cliente para Server Components e Route Handlers. Lê a sessão dos cookies,
 * então as consultas chegam ao Postgres como o usuário logado — é o que faz
 * a RLS valer. Sem sessão, toda tabela devolve zero linha.
 *
 * Fica separado do cliente de navegador de propósito: este importa
 * `next/headers`, que não pode entrar no bundle do cliente.
 */
export function clienteServidor() {
  const { url, chave } = credenciais();
  const cookieStore = cookies();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(paraGravar) {
        try {
          for (const { name, value, options } of paraGravar) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component não pode gravar cookie. O middleware já cuida
          // de renovar a sessão, então ignorar aqui é seguro.
        }
      },
    },
  });
}
