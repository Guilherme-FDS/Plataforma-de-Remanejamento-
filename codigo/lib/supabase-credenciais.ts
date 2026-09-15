/** Compartilhado pelos dois clientes. Não importa nada do Next. */
export function credenciais() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copie .env.local.example para .env.local e preencha.",
    );
  }
  return { url, chave };
}
