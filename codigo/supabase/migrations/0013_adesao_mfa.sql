-- ==========================================================================
-- Adesão ao MFA lida do banco, não da Admin API
--
-- O painel de adesão em /seguranca contava os fatores a partir de
-- `auth.admin.listUsers()`, confiando no campo `factors` de cada usuário.
-- Esse campo NÃO vem preenchido na listagem — só em `getUserById` — então o
-- painel mostrava "0 de 1" mesmo com o autenticador ativo e ativo na tela
-- logo acima, e o botão "Exigir de todos" nunca destravava.
--
-- Esta função resolve no lugar certo: `auth.mfa_factors` é a fonte da
-- verdade, e SECURITY DEFINER é o que permite lê-la (o papel
-- `authenticated` não tem acesso ao schema `auth`).
--
-- De quebra, a tela deixa de precisar da service role key — uma chave a
-- menos circulando por um caminho que só queria contar linhas.
--
-- Rode DEPOIS de 0012_mfa.sql.
-- ==========================================================================

create or replace function adesao_mfa()
returns table(id uuid, nome text, tem_fator boolean)
language sql
stable
security definer
set search_path = auth, public
as $$
  -- `sou_admin()` dentro do WHERE, e não numa policy: função SECURITY
  -- DEFINER ignora RLS por definição, então a restrição precisa estar no
  -- corpo. Quem não é admin recebe zero linha, não um erro.
  select p.id,
         p.nome,
         exists (
           select 1 from auth.mfa_factors f
           where f.user_id = p.id and f.status = 'verified'
         ) as tem_fator
    from perfis p
   where p.ativo
     and sou_admin()
   order by p.nome;
$$;

revoke execute on function adesao_mfa() from anon;

notify pgrst, 'reload schema';
