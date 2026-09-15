import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role key — ignora RLS.
 * USE SOMENTE em Server Actions / Route Handlers.
 * NUNCA importe em componentes "use client".
 */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione ao .env.local e às variáveis de ambiente da Vercel.",
    );
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
