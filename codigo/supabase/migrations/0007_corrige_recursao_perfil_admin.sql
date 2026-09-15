-- Corrige recursão infinita na RLS da tabela perfis.
--
-- A policy perfil_admin (criada em 0001) fazia uma subconsulta na própria
-- tabela perfis dentro do USING. Como perfil_admin é FOR ALL, ela também vale
-- para SELECT — então qualquer leitura de perfis disparava a subconsulta, que
-- por sua vez reavaliava a RLS de perfis, em loop. O Postgres aborta com
-- "infinite recursion detected in policy for relation perfis".
--
-- Efeito prático: perfilAtual() e verificarAdmin() engoliam o erro e devolviam
-- null — o app ficava sem nome de usuário, sem botão Sair, e recusava a criação
-- de usuários com "Requer perfil de administrador".
--
-- Solução: mover a checagem de admin para uma função SECURITY DEFINER, que
-- ignora RLS ao consultar perfis (mesma técnica já usada por e_equipe()).

create or replace function sou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and admin and ativo
  );
$$;

drop policy if exists perfil_admin on perfis;

create policy perfil_admin on perfis
  for all
  using (sou_admin())
  with check (sou_admin());
