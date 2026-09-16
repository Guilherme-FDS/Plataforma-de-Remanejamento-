---
tags: [manual, tecnico]
---

# Manual Técnico

Para quem for dar manutenção no código ou no banco de dados. Ver
[[Manual-Usuario]] para o que a plataforma faz do ponto de vista de quem
usa.

## Estrutura de pastas

```
remanejamentos/                  ← raiz do repositório Git
├── codigo/                      ← projeto Next.js (é o que a Vercel builda)
│   ├── app/                     ← rotas (App Router)
│   ├── components/              ← componentes React reutilizáveis
│   ├── lib/                     ← regras de negócio, acesso a dados, clientes Supabase
│   ├── supabase/migrations/     ← todo o histórico do schema, em ordem
│   └── scripts/                 ← scripts Python de importação/geração de seed
└── documentação/                ← este vault (não faz parte do build)
```

> ⚠️ **O Root Directory do projeto na Vercel precisa estar configurado
> como `codigo`** (Settings → General → Root Directory). Sem isso o
> deploy falha por não achar `package.json` na raiz do repositório.

## Stack

- **Next.js 14.2.15** (App Router, Server Components + Server Actions)
- **React 18.3**, **TypeScript 5.5**
- **Tailwind CSS** (paleta customizada `gtf-*`)
- **Supabase**: Postgres + Auth + Row Level Security
- **Vercel**: hospedagem e deploy automático a cada push em `main`

## Clientes Supabase (`lib/`)

Três clientes distintos, cada um com um propósito e limite claros:

- `clienteServidor()` (`lib/supabase-servidor.ts`) — usado em Server
  Components e Server Actions. Lê a sessão do cookie. **Toda consulta
  passa pela RLS** — é o cliente usado em quase tudo.
- `clienteNavegador()` (`lib/supabase-navegador.ts`) — usado só em
  Client Components para login, "esqueci a senha" e definição de nova
  senha.
- `clienteAdmin()` (`lib/supabase-admin.ts`) — usa a **service role key**,
  **ignora RLS completamente**. Só pode ser importado em Server Actions
  (nunca em `"use client"`). Usado hoje só em `app/actions/usuarios.ts`
  para convidar/gerenciar usuários via API admin do Supabase Auth.

## Autenticação

Fluxo PKCE do Supabase Auth:

1. Convite (`inviteUserByEmail`) ou redefinição de senha
   (`resetPasswordForEmail`) manda um e-mail com link para
   `/auth/callback?code=...&next=...`
2. `app/auth/callback/route.ts` troca o código pela sessão
   (`exchangeCodeForSession`) e redireciona para o `next` (normalmente
   `/auth/redefinir`)
3. `app/auth/redefinir/page.tsx` deixa a pessoa definir a própria senha
   (`supabase.auth.updateUser`)

`middleware.ts` renova a sessão a cada requisição e redireciona quem não
está logado para `/login` — mas quem protege os dados de fato é a RLS no
Postgres, não o middleware.

## Banco de dados

### Migrations

Ficam em `codigo/supabase/migrations/`, numeradas e **precisam ser
rodadas em ordem** no SQL Editor do Supabase (não há execução automática
configurada). Nenhuma delas é reexecutável às cegas — algumas fazem
`create table` sem `if not exists`.

| Arquivo | O que faz |
|---|---|
| `0001_schema.sql` | Schema inicial: tabelas de domínio, `remanejamentos`, `colaboradores`, `auditoria`, RLS base, funções `e_equipe()` e `registrar_auditoria()` |
| `0002_dados.sql` | Carga inicial de dados |
| `0003_pendencias.sql` | Tabela `importacao_pendencias` |
| `0004_fidelidade.sql` | Ajustes de fidelidade dos dados importados |
| `0005_melhorias.sql` | Adiciona `papel` e `admin` em `perfis` |
| `0006_multi_unidade.sql` | Tabela `unidades`, coluna `unidade_id` em todas as tabelas, função `minha_unidade_id()`, RLS por unidade |
| `0007_corrige_recursao_perfil_admin.sql` | Corrige recursão infinita na policy `perfil_admin` (ver "Armadilhas conhecidas" abaixo) |
| `0008_hierarquia_e_exclusao.sql` | `papel` ganha `lancador`; `alcance_unidades` em `perfis`; tabela `perfil_unidades_extra`; função `minhas_unidades_permitidas()` substitui `minha_unidade_id()` na RLS; soft delete em `remanejamentos`; admin pode gerenciar `unidades` |
| `0009_endurece_funcoes.sql` | `search_path` fixo em `situacao_remanejamento` e `tocar_atualizado_em`; tira as funções de trigger e as helpers de RLS do alcance de `anon` (responde ao Security Advisor) |
| `0010_recria_view_remanejamentos.sql` | Recria `vw_remanejamentos` para enxergar as colunas adicionadas depois da `0001` (`unidade_id`, `excluido`, …) — ver armadilha 4 abaixo |

### Tabela `perfis`

Estende `auth.users` (1:1 por `id`):

```
id                uuid PK, FK auth.users
nome              text NOT NULL
funcao            funcao_usuario NOT NULL  -- enum: medico, enfermeiro, ergonomista, tecnico_seguranca
registro          text
admin             boolean DEFAULT false   -- gerencia outros usuários
ativo             boolean DEFAULT true
papel             text DEFAULT 'operador' CHECK (visualizador|lancador|operador)
unidade_id        integer FK unidades      -- unidade "de casa", nullable
alcance_unidades  text DEFAULT 'propria' CHECK (propria|todas|especificas)
criado_em         timestamptz
```

### Hierarquia de acesso (dois eixos independentes)

Desde a migration `0008`, o acesso de cada usuário é definido por dois
campos que não se misturam:

- **`papel`** — o que a pessoa pode FAZER com dado clínico:
  `visualizador` (só lê) → `lancador` (cria/edita, não exclui) →
  `operador` (cria, edita e exclui). Checado nos Server Actions via
  `verificarPodeGerenciar()` / `verificarPodeExcluir()`
  (`app/actions/remanejamentos.ts`) — ambos fail-safe: só liberam para o
  valor exato esperado, nunca por exclusão de um valor bloqueado. As
  listas de configuração (setores, turnos, etc.) continuam exigindo
  `operador` especificamente (`app/actions/admin.ts`).
- **`alcance_unidades`** — o que a pessoa consegue VER: `propria` (só a
  unidade de casa) · `todas` (qualquer unidade — é o "gestor" que o
  usuário pediu) · `especificas` (a própria + as que o admin liberar
  individualmente, guardadas em `perfil_unidades_extra`).

A função `minhas_unidades_permitidas()` centraliza essa conta e é usada
tanto pela RLS (`equipe_unidade` em cada tabela com `unidade_id`) quanto
pelo app (`lib/dados.ts:listarUnidadesPermitidas`) — não existem dois
lugares calculando isso de formas diferentes.

### Unidade ativa (multi-unidade na prática)

Quem tem `alcance_unidades` diferente de `propria` vê um seletor de
unidade no Nav (`components/Nav.tsx`, `SeletorUnidade`). A escolha vai
para um cookie (`unidade_ativa`, definido em `lib/unidade-ativa.ts`) via
a Server Action `definirUnidadeAtiva` (`app/actions/unidades.ts`).

Ao **escrever** (lançar caso, criar item de lista), `resolverUnidadeEscrita()`
— duplicada de propósito em `app/actions/remanejamentos.ts` e
`app/actions/admin.ts`, mesma lógica nos dois — lê o cookie mas **nunca
confia nele cegamente**: sempre revalida contra
`minhas_unidades_permitidas()` no banco antes de gravar. Se o cookie
apontar para uma unidade que o usuário não pode mais ver (ex: acesso
revogado depois do cookie ser setado), a escrita cai de volta para a
unidade de casa.

### Auditoria

`registrar_auditoria()` é um trigger `SECURITY DEFINER` disparado em
`AFTER INSERT OR UPDATE OR DELETE` em `remanejamentos` e `colaboradores`.
Grava tabela, ação, usuário, e o registro inteiro antes/depois em JSONB.
**Cobre exclusão** — mesmo um DELETE físico fica com o registro completo
recuperável em `auditoria`.

### Funções `SECURITY DEFINER` usadas pela RLS

Todas em `public`, `stable`, com `set search_path = public`:

- `e_equipe()` — usuário logado está ativo em `perfis`? Usada como base de
  quase toda policy de leitura/escrita de dado clínico.
- `sou_admin()` — usuário logado tem `admin = true` e está ativo?
  (criada na migration `0007` para substituir uma subconsulta direta que
  causava recursão)
- `minha_unidade_id()` — devolve o `unidade_id` de casa do usuário logado.
  Criada na `0006`; desde a `0008` as policies usam a função abaixo.
- `minhas_unidades_permitidas()` — devolve **todas** as unidades que o
  usuário pode ver, já considerando os três alcances. É o que as policies
  `equipe_unidade` usam hoje.
- `minhas_unidades_permitidas_detalhe()` — mesma coisa com `id` + `nome`,
  para o app montar o seletor de unidade sem uma segunda consulta.

## Armadilhas conhecidas (não repetir)

1. **Nunca faça uma policy de RLS consultar a própria tabela que ela
   protege diretamente.** Isso causa recursão infinita — o Postgres
   aborta com "infinite recursion detected in policy for relation X".
   Sempre encapsule a consulta numa função `SECURITY DEFINER`, que ignora
   RLS ao rodar. (Foi o bug corrigido na migration `0007`.)
2. **Funções `language sql` validam o corpo no momento da criação.** Se a
   função referencia uma coluna que ainda não existe (porque o
   `ALTER TABLE` que a cria vem depois no mesmo script), a migration
   inteira falha e faz rollback. Sempre crie colunas antes de qualquer
   função que as leia. (Bug corrigido em `1685971`, na migration `0006`.)
3. **Checagem de permissão fail-safe, não fail-open.** Em
   `verificarOperador()` (`app/actions/remanejamentos.ts` e
   `app/actions/admin.ts`), a checagem libera **só** quando o papel lido é
   exatamente `"operador"` — nunca "bloqueia só quando for
   `'visualizador'`". Se a leitura do perfil falhar por qualquer motivo
   (RLS quebrada, coluna faltando, etc.), o fail-open liberaria acesso por
   engano. Foi exatamente isso que aconteceu antes da correção em
   `eb9062a`: a recursão do item 1 fazia a leitura do papel falhar, e o
   código antigo liberava a edição para quem devia ser bloqueado.
4. **Coluna nova em `remanejamentos` ou `colaboradores` exige recriar a
   view `vw_remanejamentos`.** A view é definida com `select r.*`, e o
   PostgreSQL expande esse `*` no momento em que a view é criada,
   congelando a lista de colunas. Adicionar coluna na tabela **não** faz
   ela aparecer na view. Como `CREATE OR REPLACE VIEW` só aceita colunas
   novas no fim da lista, a recriação tem que ser `DROP VIEW` +
   `CREATE VIEW` — sempre mantendo `with (security_invoker = true)`, senão
   a view ignora a RLS e vira um vazamento de todos os dados clínicos.
   (Foi o que derrubou a produção em 2026-09-15: a `0008` adicionou
   `excluido` na tabela, a view não enxergou, e o app quebrou com
   `column vw_remanejamentos.excluido does not exist`. Corrigido na
   migration `0010`.)
5. Nome e matrícula do colaborador são **travados** na tela de edição de
   caso, de propósito — evita que um erro de digitação "corrija" a
   identidade e quebre o vínculo com o histórico. Ver [[Manual-Usuario]].

## Variáveis de ambiente

Definidas em `codigo/.env.local` (nunca commitado) e replicadas nas
variáveis de ambiente da Vercel:

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (RLS protege os dados, não o sigilo desta chave) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço — ignora RLS. Só usada em Server Actions via `clienteAdmin()`. **Nunca expor ao cliente.** |
| `NEXT_PUBLIC_SITE_URL` | URL pública do app, usada para montar os links de convite/redefinição de senha |

## Rodando localmente

```bash
cd codigo
npm install
npm run dev       # http://localhost:3000
npm run check     # tsc --noEmit
```

## Deploy

Push em `main` → Vercel builda automaticamente a partir de `codigo/`
(Root Directory configurado nas settings do projeto na Vercel).
