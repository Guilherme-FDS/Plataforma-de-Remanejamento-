---
tags: [indice]
---

# Documentação — Plataforma de Remanejamento GTF Maringá

Vault de documentação do projeto. Separado da pasta `codigo/` (que é só o
código-fonte e o repositório Git).

## Navegação

- [[Escopo]] — o que é o projeto, arquitetura resumida, e o que está pendente agora
- Solicitações por data (histórico de tudo que foi pedido e feito):
	- [[2026-09-13]] — protótipo, Supabase/login/RLS, PWA, identidade visual
	- [[2026-09-14]] — edição de casos, admin de listas, multi-unidade, relatórios, gestão de usuários
	- [[2026-09-15]] — correções de RLS/migration, restrição de visualizador, reorganização de pastas
	- [[2026-09-16]] — análise do produto, papel na RLS, MFA, requisitos comerciais
- [[Manual-Tecnico]] — arquitetura, stack, banco de dados, deploy, como dar manutenção
- [[Manual-Usuario]] — como usar cada tela, o que cada indicador calcula, o que é automático x manual

## Como manter esta documentação atualizada

Toda vez que uma alteração for pedida e implementada, ela deve ganhar uma
entrada no arquivo do dia correspondente em **Solicitações por Data**, com
`- [x]` se foi concluída ou `- [ ]` se ficou pendente. O arquivo [[Escopo]]
lista manualmente os itens `[ ]` em aberto — ao fechar um pendente, atualize
os dois lugares.
