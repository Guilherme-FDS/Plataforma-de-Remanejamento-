-- ==========================================================================
-- Endurecimento das funções — responde aos avisos do Security Advisor
--
-- 1. search_path fixo em situacao_remanejamento e tocar_atualizado_em
-- 2. Funções de trigger deixam de ser chamáveis pela API REST
-- 3. Helpers de RLS deixam de ser chamáveis por quem não está logado
--
-- O QUE NÃO É MEXIDO, DE PROPÓSITO: o EXECUTE de `authenticated` nas
-- helpers de RLS (e_equipe, sou_admin, minha_unidade_id,
-- minhas_unidades_permitidas*). As policies chamam essas funções e são
-- avaliadas com o papel de quem consulta — revogar ali desliga a RLS do
-- app inteiro. O Advisor avisa sobre elas, mas é o funcionamento correto.
--
-- Rode DEPOIS de 0008_hierarquia_e_exclusao.sql.
-- ==========================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1 — search_path fixo                                                     ║
-- ║   Sem isso, o que a função enxerga depende do search_path de quem        ║
-- ║   chama. Nenhuma das duas é SECURITY DEFINER (rodam com o privilégio     ║
-- ║   do chamador), então o risco era baixo — mas custa uma linha.           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Mesma assinatura e mesmo retorno da 0001: a view vw_remanejamentos
-- depende desta função, e um CREATE OR REPLACE só é aceito se a assinatura
-- não mudar.
create or replace function situacao_remanejamento(
  p_duracao_tipo       duracao_tipo,
  p_data_prevista_fim  date,
  p_data_encerramento  date
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_data_encerramento is not null           then 'encerrado'
    when p_duracao_tipo = 'permanente'             then 'permanente'
    when p_duracao_tipo in ('gestacao', 'licenca') then 'acompanhamento'
    when p_data_prevista_fim is null               then 'sem_previsao'
    when p_data_prevista_fim >= current_date       then 'em_andamento'
    else 'a_encerrar'
  end;
$$;

create or replace function tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2 — Funções de trigger fora da API                                       ║
-- ║   Estavam expostas como /rest/v1/rpc/registrar_auditoria e               ║
-- ║   /rest/v1/rpc/tocar_atualizado_em. Trigger é disparado pelo Postgres,   ║
-- ║   que não depende do EXECUTE do usuário — os triggers continuam          ║
-- ║   funcionando normalmente depois disto.                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

revoke execute on function registrar_auditoria() from anon, authenticated;
revoke execute on function tocar_atualizado_em()  from anon, authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3 — Helpers de RLS: fora do alcance de quem não está logado             ║
-- ║   Sem sessão, auth.uid() é nulo e todas já devolviam vazio/falso — o     ║
-- ║   ganho é fechar a porta, não impedir vazamento. O app nunca consulta    ║
-- ║   dado sem sessão (o middleware manda para o login antes).               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

revoke execute on function e_equipe()                          from anon;
revoke execute on function sou_admin()                         from anon;
revoke execute on function minha_unidade_id()                  from anon;
revoke execute on function minhas_unidades_permitidas()        from anon;
revoke execute on function minhas_unidades_permitidas_detalhe() from anon;

notify pgrst, 'reload schema';
