# Pendências e melhorias

Estado em 13/09/2026, com retoques em 17/09/2026 (marcados abaixo). Três
seções: **o que falta sobre as pessoas** (dado), **o que falta no sistema**
(funcionalidade) e **o que precisa de decisão sua**.

> Este arquivo cobre o levantamento original de 13/09. A partir de 16/09 as
> novas pendências (segurança, comercial) passaram a ficar em
> `documentação/02-Solicitações por Data/`, com uma entrada por dia — é lá
> que está o estado mais atual.

---

## 1. Fidelidade à planilha

**Situação: resolvida pela migration `0004_fidelidade.sql`** — depois de
rodá-la, o banco tem **132 de 132** registros.

O schema original barrava 4 linhas, e o motivo era um erro de projeto meu:
exigir matrícula e proibir duplicata é correto para dado digitado **hoje**,
mas apagar o que a planilha registrou é perder histórico clínico.

| Linha | Pessoa | O que barrava | Como ficou |
|---|---|---|---|
| 28 | Aline Ribeiro | sem matrícula | `matricula` passa a aceitar nulo |
| 45 | João Victor Viera da Silva | sem matrícula | idem |
| 73 | Cristina Rosario da Silva | sem matrícula | idem |
| 131 | Paulo Roberto de Andrade | duplicata da L135 | marcada em `possivel_duplicata_de`, não apagada |

A proteção contra duplicata acidental continua: o índice único agora só vale
para registros **não** marcados como duplicata.

### Linhas descartadas — e por quê

As linhas **132, 133 e 134** da planilha têm apenas a palavra "ABRIL" na
coluna Mês. Sem nome, sem data, sem nada. Estão registradas em
`importacao_pendencias` como descartadas. Se você souber o que deveriam ser,
dá para preencher.

---

## 2. O que falta sobre as pessoas

### 2.1 Matrícula ausente — 3 pessoas

Precisam ser buscadas no RH:

- **Aline Ribeiro** — Evisceração, 2º turno. Restrição **permanente**
- **João Victor Viera da Silva** — Plataforma, 2º turno. Restrição **permanente**
- **Cristina Rosario da Silva** — Evisceração, 1º turno. Encerrada em 30/11/2025

As duas primeiras têm restrição permanente ativa. São pessoas em
acompanhamento que a planilha não conseguia rastrear.

```sql
update colaboradores set matricula = 00000
 where matricula is null and nome = 'Aline Ribeiro';
```

### 2.2 Campos que a planilha nunca teve

Nenhum destes existe para **nenhuma** das 124 pessoas. Cada um tem um uso
concreto — a lista não é de "seria bom ter":

| Campo | Para que serve |
|---|---|
| **Data de admissão** | Tempo de casa no momento da lesão. É o que separa "chegou lesionado" de "a função lesionou" — e isso muda nexo ocupacional |
| **Função / cargo** | Hoje só há setor. Dentro de Evisceração há funções com exigências físicas muito diferentes |
| **CID** | Permite agrupar por diagnóstico de verdade, em vez de texto livre ("DOR NO OMBRO" × "DOR EM OMBRO" são a mesma coisa hoje) |
| **Nº da CAT** | Liga o caso ao registro legal do acidente |
| **Data de nascimento** | Faixa etária é fator de risco ergonômico conhecido |
| **Centro de custo** | Atribui o custo da restrição a quem decide sobre o posto |
| **Anexos** (atestado, ASO, laudo) | Hoje o documento fica fora do sistema |
| **Efetivo por setor** | Ver seção 4 — é o mais importante |

### 2.3 Classificações incertas — 6 casos

Já listados em `/pendencias`:

- **L59, Jephte Omelus** — Tipo gravado como `?`. Clínico ou ocupacional?
- **L85, Pedro Ronald** — encerramento 23/01/2025 anterior ao início 22/09/2025. A data foi anulada na importação; falta a correta
- **L73 (Labirintite)**, **L131/L135 (Pós-operatório)**, **L159 (Hérnia umbilical)** — segmentos que não se encaixam em região do corpo. São diagnósticos, não segmentos. Precisam de região própria ou reclassificação

### 2.4 Nomes possivelmente duplicados

Não unifiquei porque não tenho como saber:

- **Geovani** × **Giovanni** (supervisores)
- **Valdeir** × **Valdeci** (supervisores)

Se forem a mesma pessoa, a contagem por supervisor está dividida em dois.

---

## 3. O que falta no sistema

Em ordem de impacto:

### 3.1 Gravar o lançamento — **resolvido, confirmado em 17/09**
`salvarRemanejamento()` (`app/actions/remanejamentos.ts`) já faz o insert
completo, com a lógica de reaproveitar colaborador sem matrícula que entrou
na rodada de 16/09. Este item estava desatualizado — já não descrevia o
sistema atual.

### 3.2 Encerrar caso pela tela
`data_encerramento` existe no banco e a situação `a_encerrar` já aponta quem
precisa. Falta o botão.

### 3.3 Resolver pendência pela tela
`importacao_pendencias` tem `resolvida`, `resolvida_por` e `resolvida_em`.
Hoje a tela é só leitura.

### 3.4 Editar registro
Não há edição. Corrigir um erro exige SQL.

### 3.5 Exportar
Sem exportação para Excel ou PDF. A equipe vai precisar levar número para
reunião.

### 3.6 Cadastro de usuários pela tela
Criar um novo membro da equipe hoje exige `insert into perfis` no SQL Editor.

### 3.7 Gerir as listas
Setor, supervisor, profissional e segmento só mudam por SQL.

### 3.8 Notificar vencimento — **decisão pendente, adiado em 17/09**
O painel mostra o que vence, mas ninguém é avisado. Um e-mail ou push
semanal com "vence nos próximos 15 dias" fecharia o ciclo.

Discutido em 17/09 e conscientemente deixado de fora dessa rodada: falta
decidir o provedor antes de construir — e-mail (Resend, ou SMTP da GTF) ou
push do PWA (precisa de VAPID keys). Nenhuma das duas opção tem custo
relevante, é só escolha.

---

## 4. O que depende de decisão sua

### 4.1 Efetivo por setor — **ligado em 17/09**

A coluna `setores.efetivo` agora é editável em `/admin` → aba Setores, e
`/indicadores` mostra o card "Incidência por 100 colaboradores" assim que
houver efetivo cadastrado. Falta só preencher o número de cada setor —
pode ser aproximado e atualizado de vez em quando, pela própria tela:

```sql
update setores set efetivo = 400 where nome = 'Evisceração';
update setores set efetivo = 120 where nome = 'Cone';
-- etc. — ou pela tela em /admin, sem precisar de SQL
```

### 4.2 A inversão clínico × ocupacional

| | 2025 | 2026 |
|---|---|---|
| Clínico | 49 | 22 |
| Ocupacional | **1** | **45** |

Uma inversão dessa magnitude em um ano não é epidemiologia — é mudança de
quem classifica ou de como classifica. Reclassificar um caso como
ocupacional muda obrigação de CAT, PPP e eSocial (S-2210/S-2220).

Se os casos de 2025 estavam subclassificados, existe passivo. Vale confirmar
internamente antes de o indicador ser usado em reunião.

### 4.3 Retenção de dados

Não há política. Dado de saúde não deve ficar indefinidamente — a LGPD pede
prazo definido e vinculado à finalidade. Quanto tempo o histórico fica?

### 4.4 Quem mais entra

Hoje só medicina ocupacional e ergonomia. Se supervisor de setor for entrar
depois, o desenho muda: ele não pode ver diagnóstico, só a restrição. Isso
exige mascaramento por perfil, que hoje não existe porque não era necessário.

---

## 5. Riscos conhecidos

- ~~Sem testes automatizados~~ — **resolvido em 17/09**: `lib/calculos.test.ts`
  (Vitest, `npm test`) cobre `situacaoDe()` e `incidenciaPorSetor()`,
  comentado ramo a ramo com o `situacao_remanejamento()` equivalente no
  Postgres. A paridade entre TS e SQL continua manual (sem banco neste
  ambiente para rodar os dois lados juntos).
- ~~Sem backup configurado no Supabase~~ (plano free, retenção curta) —
  **resolvido em 17/09**, coberto por fora: `.github/workflows/backup-banco.yml`
  faz `pg_dump` diário criptografado numa branch órfã `backups` deste
  repositório. Testado ao vivo e confirmado rodando — ver
  `documentação/02-Solicitações por Data/2026-09-17.md` para o histórico
  de erros corrigidos (senha, IPv6, versão do pg_dump, checkout).
- ~~Sem MFA~~ — **resolvido em 16/09**, ver `documentação/02-Solicitações
  por Data/2026-09-16.md` e `2026-09-17.md` (diagnóstico de um incidente
  de adoção).
- ~~Sem headers de segurança~~ — **resolvido em 17/09**: CSP (com nonce),
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` em `middleware.ts`; `poweredByHeader: false` em
  `next.config.js`.
- ~~Sem observabilidade~~ — **atenuado em 17/09**: tabela
  `erros_aplicacao` (migration `0015`) + aba "Erros" em `/admin`. Não é
  Sentry — não agrega, não alerta — mas tira a dependência de alguém
  reclamar pra um problema aparecer.
- **A `anon key` é pública** e está no bundle do app. Isso é por design; o
  que protege é a RLS. Qualquer tabela nova precisa de `enable row level
  security` **e** policy — esquecer uma das duas abre o banco.
- **Next 14.2.15 tem CVE conhecida** (avisado pelo `npm install`) — vale
  planejar upgrade. Não atacado ainda.
- **Sem rate limit** em tentativas de senha e código MFA. Avaliado em
  17/09, adiado por decisão do usuário.
