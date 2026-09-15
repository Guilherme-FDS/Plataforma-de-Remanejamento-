import { createBrowserClient } from "@supabase/ssr";
import { credenciais } from "./supabase-credenciais";

/** Cliente para componentes com "use client" — usado só no login. */
export function clienteNavegador() {
  const { url, chave } = credenciais();
  return createBrowserClient(url, chave);
}
