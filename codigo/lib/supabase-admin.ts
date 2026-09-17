import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role key — ignora RLS.
 * USE SOMENTE em Server Actions / Route Handlers.
 * NUNCA importe em componentes "use client".
 *
 * Auditoria de 17/09: só 2 chamadores no projeto inteiro, os dois
 * legítimos porque pedem algo que a chave anônima não alcança —
 * `auth.users` não é uma tabela do schema `public`, não tem RLS pra pedir
 * emprestado:
 *
 *   - `listarUsuarios()` (app/actions/usuarios.ts) — email, confirmado e
 *     último login vêm de `auth.users`, não de `perfis`.
 *   - `criarUsuario()` (app/actions/usuarios.ts) — `inviteUserByEmail()` e
 *     o `deleteUser()` de rollback são operações administrativas do
 *     GoTrue, sem equivalente na API pública.
 *
 * Qualquer uso novo desta função merece a mesma pergunta: dá pra fazer
 * com `clienteServidor()` + RLS, ou com uma função `security definer` no
 * Postgres (como `adesao_mfa()`, migration 0013, fez pra tirar a service
 * role da tela de MFA)? Se der, é sempre a opção mais segura — uma chave a
 * menos que ignora toda a proteção do banco.
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
