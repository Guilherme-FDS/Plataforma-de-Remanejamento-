# Plataforma de Remanejamento — Maringá

Controle de restrições funcionais e remanejamentos para medicina ocupacional
e ergonomia. Substitui a planilha `REMANEJADOS MARINGÁ 2026.xlsx` com dois
objetivos: **lançar mais rápido** e **ter indicador que sustente decisão**.

---

## ⚠️ Antes de tudo: este projeto lida com dado de saúde identificado

A base tem nome, matrícula e diagnóstico de 121 pessoas reais, incluindo
condições clínicas graves e permanentes. Isso é **dado pessoal sensível**
(LGPD art. 5º, II e art. 11).

Por isso:

- `dados/*.json` e `supabase/migrations/0002_dados.sql` estão no `.gitignore`.
  **Só remova essa regra se o repositório for privado.**
- O projeto Supabase deve ter o **auto-cadastro desligado**
  (Authentication → Providers → Email → *Enable signup* = off). Usuário só
  existe se alguém da equipe criar.
- A planilha `.xlsx` de origem nunca entra no repositório.

---

## Rodando o protótipo

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`.

Se `dados/*.json` não existir (repositório recém-clonado), gere a partir da
planilha:

```bash
python scripts/importar.py "caminho/para/REMANEJADOS MARINGÁ 2026.xlsx"
```

Requer `openpyxl` (`pip install openpyxl`).

---

## Telas

| Rota | O que faz |
|---|---|
| `/` | Painel: o que precisa de ação hoje, focos ergonômicos, carteira aberta |
| `/remanejamentos` | Lista com filtros por situação, setor, turno, região, tipo e ano |
| `/remanejamentos/novo` | Lançamento — matrícula preenche o resto, previsão calculada |
| `/colaboradores/[matricula]` | Ficha e histórico completo, com alerta de reincidência |
| `/indicadores` | Volume ano contra ano, região do corpo, setor, duração, reincidência |
| `/pendencias` | O que a importação não conseguiu resolver sozinha |

---

## Como está montado

```
scripts/importar.py     planilha  ->  dados/*.json   (normalização)
scripts/gerar_seed.py   dados/*.json  ->  0002_dados.sql
lib/dados.ts            ÚNICO ponto de acesso a dados
lib/calculos.ts         regras de negócio: situação, indicadores, clusters
```

**`lib/dados.ts` é a costura.** Hoje lê os JSON; quando o Supabase existir,
só esse arquivo muda — as telas não são tocadas.

Três decisões que resolvem falhas estruturais da planilha:

1. **Pessoa separada de evento.** `colaboradores` ← `remanejamentos`. Na
   planilha cada linha era um evento solto, então reincidência só aparecia
   no olho.
2. **Duração é tipo + número**, não texto. `PERMANENTE`, `GESTANTE` e
   `30 DIAS` ocupavam o mesmo campo, o que impedia somar ou filtrar.
3. **Situação é derivada, nunca digitada** — ver `situacaoDe()`:

   | Situação | Quando |
   |---|---|
   | `em_andamento` | previsão de término no futuro |
   | `a_encerrar` | prazo venceu e ninguém confirmou o desfecho |
   | `encerrado` | desfecho confirmado |
   | `permanente` | sem prazo, exige reavaliação |
   | `acompanhamento` | gestação / licença — termina por evento |
   | `sem_previsao` | falta duração; não dá para acompanhar |

---

## Subir o banco no Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com) — **separado**
   de qualquer outro projeto seu. Região `South America (São Paulo)`.
2. Authentication → Providers → Email → desligue **Enable signup**.
3. SQL Editor. Abra `supabase/migrations/0001_schema.sql` e rode
   **um bloco por vez**, na ordem — o editor do Supabase executa o script
   inteiro numa única transação, então um erro no fim desfaz tudo que veio
   antes, inclusive o que aparentemente funcionou.
4. Rode `supabase/migrations/0002_dados.sql` (gerado por
   `python scripts/gerar_seed.py`) da mesma forma.
5. Crie o primeiro usuário em Authentication → Users → *Add user*, e depois
   o perfil correspondente:

   ```sql
   insert into perfis (id, nome, funcao, admin)
   values ('<uuid-do-usuario>', 'Seu Nome', 'medico', true);
   ```

O `0002_dados.sql` carrega 128 dos 132 registros. Os 4 que ficam de fora
violam constraint (3 sem matrícula, 1 duplicata) e estão listados em
comentário no topo do arquivo e na tela `/pendencias`.

---

## Publicar na Vercel

O protótipo não precisa de variável de ambiente: os dados são lidos em tempo
de build. Só que **`dados/*.json` está no `.gitignore`** — sem eles o build
falha na Vercel. Escolha um caminho:

**A. Repositório privado (recomendado)**

1. GitHub → Settings → *Change repository visibility* → **Private**.
2. Remova do `.gitignore` as duas últimas linhas (`dados/*.json` e
   `supabase/migrations/0002_dados.sql`), então:
   ```bash
   git add -A && git commit -m "Adiciona base importada" && git push
   ```
3. [vercel.com/new](https://vercel.com/new) → *Import Git Repository* →
   selecione o repositório → **Deploy**. A Vercel detecta Next.js sozinha;
   não mexa em build command nem output directory.

**B. Repositório público**

Os dados ficam só na sua máquina. Para publicar, conecte antes o Supabase
(o app passa a ler do banco em runtime, e nada sensível entra no git).
Enquanto isso, rode local com `npm run dev`.

Em qualquer caso, quando o Supabase entrar, adicione na Vercel
(Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## Verificação

Não há suíte de testes. Antes de subir:

```bash
npx tsc --noEmit
npm run build
```

---

## O que ainda não existe

- Gravação de verdade — o formulário valida e mostra o registro pronto, mas
  quem persiste é o Supabase.
- Login e auditoria — o schema já tem `perfis`, `auditoria` e as policies de
  RLS; falta ligar na aplicação.
- **Incidência por 100 colaboradores** — depende do efetivo de cada setor
  (coluna `setores.efetivo`, hoje vazia). É o indicador mais acionável que
  falta: contagem absoluta esconde qual setor está pior.
- Resolver pendência pela tela (hoje a lista é somente leitura).
