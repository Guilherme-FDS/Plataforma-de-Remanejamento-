---
tags: [manual, usuario]
---

# Manual do Usuário

Guia de referência de cada tela da plataforma: o que mostra, o que
calcula sozinha e o que depende de ação manual. Para dúvidas técnicas
(banco de dados, deploy), ver [[Manual-Tecnico]].

## Perfis de acesso

O acesso de cada pessoa é definido por **duas coisas separadas**: o que
ela pode *fazer* (papel) e o que ela pode *ver* (alcance de unidades).

### Papel — o que pode fazer

- **Visualizador** — só consulta telas e exporta relatórios. Não vê
  "Novo lançamento" nem "Config.", e não consegue editar/encerrar mesmo
  digitando o endereço direto.
- **Lançador** — cria e edita casos, encerra casos. **Não pode excluir.**
- **Operador** — cria, edita, encerra e **exclui** casos; acessa
  Configurações.

### Alcance de unidades — o que pode ver

- **Só a própria unidade** — enxerga apenas os dados da unidade dele.
- **Todas as unidades** — é o caso do gestor: enxerga tudo.
- **Unidades específicas** — a própria mais as unidades que o
  administrador liberar individualmente.

Quem enxerga mais de uma unidade vê um **seletor de unidade** no menu do
topo. A unidade escolhida ali define o que aparece nas telas e em qual
unidade um novo lançamento é gravado.

### Administrador

Marcação à parte (independente do papel): quem é administrador também
gerencia usuários e unidades em Configurações.

## O que é calculado automaticamente

Isto é o ponto central da plataforma: **nenhuma situação, prazo ou
indicador é digitado por alguém** — tudo é derivado da data de início, da
duração informada e da data de hoje. É a falha que a planilha antiga
tinha.

### Situação de um caso

Calculada a partir de `data de início` + `duração` + `data de hoje`:

| Situação | Quando acontece |
|---|---|
| **Em andamento** | Tem prazo e ele ainda não venceu |
| **A encerrar** | Tem prazo e ele já venceu, mas ninguém confirmou o desfecho |
| **Encerrado** | Foi marcado como encerrado (com data de encerramento) |
| **Permanente** | Duração cadastrada como "Permanente" — restrição sem prazo, exige reavaliação periódica manual |
| **Acompanhamento** | Duração "Até o fim da gestação" ou "Licença-maternidade" |
| **Sem previsão** | Não tem duração cadastrada — por isso não dá para saber quando revisar |

A previsão de término (data) é sempre `data de início + dias de duração`
— nunca é digitada diretamente.

### Focos ergonômicos (Painel)

Agrupa casos por **setor + região do corpo**. Quando **3 ou mais casos**
da mesma combinação aparecem nos **últimos 180 dias**, vira um "foco" —
o padrão que justifica uma análise ergonômica de verdade, em vez de
tratar cada caso isoladamente.

### Reincidência

Qualquer colaborador com **2 ou mais remanejamentos** no histórico entra
como reincidente. Quando todos os casos dele são da mesma região do
corpo, isso é destacado — sinal de que a medida anterior não resolveu.

### Indicadores (tela "Indicadores")

- **Casos no ano** — comparado ao ano anterior, mas só nos meses em que o
  ano atual já tem dado lançado (comparação "período a período", não o
  ano inteiro contra o ano inteiro).
- **Duração média / mediana** — calculada só sobre os casos com duração
  em dias (ignora permanentes, gestação e licença, que não têm prazo
  fixo).
- **Dias de restrição** — soma de todos os prazos temporários do ano.
- **Reincidentes** — quantos colaboradores tiveram 2+ casos no ano
  selecionado.
- **Casos por mês** — comparação visual mês a mês contra o ano anterior.
- **Como a classificação mudou** — variação percentual de cada tipo de
  restrição (clínico, ocupacional, acidente de trabalho, acidente
  doméstico) entre o ano anterior e o atual.

## O que precisa de ação manual

- **Lançar um caso novo** — tela "Novo lançamento". Setor, turno e
  supervisor vêm preenchidos ao digitar a matrícula (se o colaborador já
  existe na base); a previsão de término nunca é digitada, só a duração.
- **Editar um caso** — tela "Casos" → botão "Editar". **Nome e matrícula
  do colaborador ficam travados de propósito**: evita que uma correção de
  digitação rompa o vínculo com o histórico da pessoa. Se o nome foi
  digitado errado, é necessário excluir o lançamento e lançar de novo
  *(exclusão ainda não implementada — ver [[Escopo]])*.
- **Encerrar um caso** — botão "Encerrar" na lista de Casos ou no Painel;
  pede a data de encerramento.
- **Toda edição e encerramento gera histórico automaticamente** — não é
  preciso preencher nada a mais para isso: um gatilho no banco grava
  quem alterou, quando, e o estado antes/depois, sempre que um caso é
  criado, editado ou excluído.

## Telas

### Painel

Visão do dia a dia: indicadores de topo (Vigentes, A encerrar, Sem
previsão, Permanentes), Focos ergonômicos, casos que precisam de ação
(prazo vencido) e casos vencendo nos próximos 30 dias.

### Casos

Lista completa de remanejamentos, com filtros por situação, setor,
turno, região do corpo, tipo e ano. É daqui que se edita e encerra um
caso.

### Indicadores

Comparativos ano a ano — ver seção acima.

### Relatórios

Mesmos dados de Casos, mas voltado para exportação: filtro por múltiplos
setores e situação, gráficos de composição, e exportação em CSV ou
impressão em PDF *(hoje o PDF imprime a tela inteira; está pendente
trocar para uma versão limpa em aba separada — ver [[Escopo]])*.

### Pendências

> ⚠️ **Importante**: hoje esta tela é só um **retrato estático da
> importação inicial** da planilha, feita uma única vez na criação do
> sistema. Ela **não é** um recurso vivo:
>
> - É **somente leitura** — não tem como clicar num item e abrir o
>   colaborador para corrigir, nem marcar como resolvido.
> - **Não existe verificação automática** — um lançamento feito hoje que
>   fique incompleto (sem matrícula, sem segmento, etc.) **não** aparece
>   aqui. A lista é fixa, do que a planilha original trouxe de
>   inconsistente.
>
> Virar uma tela de ação de verdade (abrir o colaborador, corrigir, marcar
> resolvido, com ou sem detecção automática de novos lançamentos
> incompletos) é uma decisão de produto ainda em aberto — ver [[Escopo]].

### Configurações

Só para operador. Abas:

- **Usuários** *(só para admin)* — criar usuário (envia convite por
  e-mail), editar, desativar/reativar, reenviar link de redefinição de
  senha.
- **Setores, Turnos, Supervisores, Profissionais, Segmentos, Regiões** —
  cadastro das listas usadas nos formulários de lançamento. Dá para
  criar, renomear e desativar/reativar cada item (desativar não apaga o
  histórico de casos que já usaram aquele item).

## Login e senha

- **Esqueci a senha** — link na tela de login, manda e-mail de
  redefinição.
- Um administrador também pode **reenviar o link de redefinição** pelo
  próprio painel de Usuários, sem precisar que a pessoa peça.
- Ninguém se autocadastra — todo acesso é criado por um administrador
  dentro da plataforma.
