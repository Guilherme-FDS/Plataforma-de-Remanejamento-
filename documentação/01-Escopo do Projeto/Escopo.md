---
tags: [escopo]
---

# Escopo do Projeto

## O que é

Plataforma web para a equipe de Medicina Ocupacional e Ergonomia da GTF
Maringá controlar **remanejamentos** — realocações temporárias ou
permanentes de colaboradores por restrição funcional (médica ou
ergonômica). Substitui uma planilha de Excel que era a única fonte da
verdade e não calculava nada sozinha (prazos, situação de cada caso e
reincidências eram lançados manualmente).

## Para quem

Equipe de medicina ocupacional e ergonomia, em uma ou mais unidades da
GTF. O acesso de cada pessoa tem dois eixos independentes:

- **Papel** (o que pode fazer): **Visualizador** (só consulta e exporta)
  · **Lançador** (cria e edita casos, não exclui) · **Operador** (cria,
  edita e exclui casos; acessa Configurações)
- **Alcance de unidades** (o que enxerga): só a própria · todas · a
  própria + unidades específicas liberadas pelo admin

Ver [[Manual-Usuario]] para o detalhe de cada tela e [[Manual-Tecnico]]
para o modelo de permissões no banco.

## Arquitetura (resumo)

- **Front-end + back-end**: Next.js 14 (App Router), TypeScript, Tailwind.
- **Banco de dados**: Supabase (Postgres), com Row Level Security — a
  proteção de verdade dos dados está no banco, não na tela.
- **Autenticação**: Supabase Auth (e-mail + senha), convite e redefinição
  de senha via link por e-mail.
- **Hospedagem**: Vercel, deploy automático a cada push na branch `main`.
- **Estrutura de pastas do repositório**: `codigo/` (projeto Next.js) e
  `documentação/` (este vault), lado a lado.

Detalhes completos em [[Manual-Tecnico]].

## Como o dado entra no sistema

1. **Lançamento manual** — tela "Novo lançamento", usada no dia a dia.
2. **Importação inicial da planilha** — feita uma única vez na criação do
   sistema, por script (`scripts/importar.py`). Inconsistências daquela
   importação viraram registros em **Pendências** (ver [[Manual-Usuario]]
   para o que essa tela realmente faz hoje).

## Feito recentemente

- [x] Exportar relatório em **XLSX** em vez de CSV — [[2026-09-15]]
- [x] PDF do relatório abre em **aba nova** (`/relatorios/imprimir`), só
      com cabeçalho + tabela — [[2026-09-15]]
- [x] **Excluir lançamento** (soft delete, permissão de operador), com
      tela de restaurar — [[2026-09-15]]
- [x] **Modal** ao clicar num usuário em Configurações → Usuários, com
      dados completos — [[2026-09-15]]
- [x] **Hierarquia de acesso granular**: papel
      (visualizador/lançador/operador) × alcance de unidades
      (própria/todas/específicas), configurável por usuário em
      Configurações — [[2026-09-15]]
- [x] **Unidades**: aba para criar/gerenciar (nasce vazia), seletor de
      unidade ativa no menu (com opção "Todas as unidades") e **todo o
      conteúdo das telas filtrado pela unidade em contexto** — [[2026-09-15]]
- [x] **Modal com os próprios dados** ao clicar no nome no topo, para
      qualquer papel — [[2026-09-15]]
- [x] **Pendências viraram tela de ação**: seção automática com as quatro
      regras de dado faltando, link para a ficha, botão "Corrigir", e
      "Marcar resolvida" nas pendências antigas da importação —
      [[2026-09-15]]

> Migrations `0008`, `0009` e `0010` já aplicadas em produção.

## Pendente / em aberto

> Atualizado manualmente. Ver o arquivo do dia em que o item foi pedido
> para o contexto completo da conversa.

- [ ] **Limpeza do banco de dados** para demonstração ao gestor do
      departamento (apagar dados reais de colaboradores/remanejamentos,
      manter listas de configuração como setores/turnos/segmentos) —
      **em stand by por decisão do usuário; nada foi tocado no banco.** —
      [[2026-09-15]]
- [ ] **Rodada de testes completa** do usuário sobre tudo que foi entregue
      em 2026-09-15 — [[2026-09-15]]

### Configurações do Supabase (painel, não é código)

- [ ] Desligar **"Allow new users to sign up"** — está ligado, mas o
      sistema não tem auto-cadastro: todo acesso nasce de convite do
      administrador. Não vaza dado (sem linha em `perfis`, a RLS bloqueia
      tudo), mas é porta aberta sem motivo.
- [ ] **Senha mínima de 6 → 8** e **exigir letras + números**. Hoje a tela
      de definir senha cobra 8 caracteres, mas isso é validação só no
      navegador — o Supabase aceita 6. Os dois precisam concordar.
- [ ] ~~Proteção contra senha vazada (HaveIBeenPwned)~~ — **indisponível**:
      exige plano Pro, e o projeto está no Free. Não vale assinar só por
      isso se as duas medidas acima forem aplicadas.
