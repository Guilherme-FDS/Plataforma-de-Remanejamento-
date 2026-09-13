import { Barras, Cabecalho, Cartao, Indicador, Vazio } from "@/components/ui";
import {
  MESES_CURTOS,
  TIPO_ROTULO,
  anoDe,
  anosDisponiveis,
  contarPor,
  estatisticaDuracao,
  porMes,
  reincidencias,
} from "@/lib/calculos";
import { listarRemanejamentos } from "@/lib/dados";
import type { Remanejamento } from "@/lib/tipos";

export default function Indicadores({
  searchParams,
}: {
  searchParams: { ano?: string };
}) {
  const todos = listarRemanejamentos().filter((r) => !r.duplicataDe);
  const anos = anosDisponiveis(todos);
  const ano = Number(searchParams.ano) || anos[0];
  const anterior = ano - 1;

  const doAno = todos.filter((r) => anoDe(r) === ano);
  const doAnterior = todos.filter((r) => anoDe(r) === anterior);

  const serieAno = porMes(todos, ano);
  const serieAnterior = porMes(todos, anterior);

  // Comparável: só os meses em que o ano atual já tem registro.
  const ultimoMes = serieAno.reduce((u, v, i) => (v > 0 ? i : u), -1);
  const acumAno = serieAno.slice(0, ultimoMes + 1).reduce((s, v) => s + v, 0);
  const acumAnterior = serieAnterior
    .slice(0, ultimoMes + 1)
    .reduce((s, v) => s + v, 0);
  const variacao =
    acumAnterior > 0
      ? Math.round(((acumAno - acumAnterior) / acumAnterior) * 100)
      : null;

  const duracao = estatisticaDuracao(doAno);
  const duracaoAnterior = estatisticaDuracao(doAnterior);
  const reincidentes = reincidencias(doAno);

  return (
    <>
      <Cabecalho
        titulo="Indicadores"
        descricao="Tudo calculado a partir dos lançamentos. Nenhum número é digitado."
        acao={
          <div className="flex gap-1.5">
            {anos.map((a) => (
              <a
                key={a}
                href={`/indicadores?ano=${a}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  a === ano
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
                }`}
              >
                {a}
              </a>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador
          rotulo={`Casos em ${ano}`}
          valor={doAno.length}
          nota={
            variacao !== null
              ? `${variacao >= 0 ? "+" : ""}${variacao}% vs ${anterior} no mesmo período (${acumAnterior})`
              : undefined
          }
          destaque={variacao !== null && variacao > 15 ? "atencao" : undefined}
        />
        <Indicador
          rotulo="Duração média"
          valor={`${duracao.media}d`}
          nota={
            duracaoAnterior.media > 0
              ? `mediana ${duracao.mediana}d · ${anterior}: ${duracaoAnterior.media}d`
              : `mediana ${duracao.mediana}d`
          }
        />
        <Indicador
          rotulo="Dias de restrição"
          valor={duracao.totalDias.toLocaleString("pt-BR")}
          nota={`soma dos prazos de ${duracao.n} casos temporários`}
        />
        <Indicador
          rotulo="Reincidentes"
          valor={reincidentes.length}
          nota="colaboradores com 2+ casos no ano"
        />
      </div>

      <Cartao
        className="mt-6"
        titulo={`Casos por mês — ${ano} contra ${anterior}`}
        descricao="A planilha não conseguia fazer esta comparação: os dois anos estavam misturados na mesma coluna, sem campo de ano."
      >
        <SerieMensal
          atual={serieAno}
          anterior={serieAnterior}
          rotuloAtual={String(ano)}
          rotuloAnterior={String(anterior)}
        />
      </Cartao>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Cartao
          titulo="Região do corpo"
          descricao="Para onde apontar a análise ergonômica."
        >
          <Barras itens={contarPor(doAno, (r) => r.regiao)} />
        </Cartao>

        <Cartao titulo="Setor" descricao="Contagem absoluta de casos.">
          <Barras itens={contarPor(doAno, (r) => r.setor)} />
          <p className="border-t border-slate-100 px-5 py-3 text-xs leading-snug text-slate-500">
            Contagem bruta não diz qual setor está pior — um setor com 400
            pessoas e 13 casos está melhor que um com 20 pessoas e 6. Com o
            efetivo de cada setor, isto vira <strong>incidência por 100
            colaboradores</strong>, que é o número acionável.
          </p>
        </Cartao>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Cartao titulo="Tipo" descricao="Natureza do afastamento.">
          <Barras
            itens={contarPor(doAno, (r) => TIPO_ROTULO[r.tipo])}
          />
        </Cartao>

        <Cartao titulo="Turno">
          <Barras itens={contarPor(doAno, (r) => r.turno)} />
        </Cartao>

        <Cartao titulo="Profissional responsável">
          <Barras itens={contarPor(doAno, (r) => r.profissional)} />
        </Cartao>
      </div>

      {doAnterior.length > 0 && (
        <Cartao
          className="mt-6"
          titulo={`Como a classificação mudou entre ${anterior} e ${ano}`}
          descricao="Mudança grande na proporção clínico/ocupacional costuma indicar mudança de critério de classificação, não de perfil de adoecimento — e altera obrigação de CAT, PPP e eSocial. Vale confirmar internamente."
        >
          <ComparativoTipo atual={doAno} anterior={doAnterior} rotuloAtual={String(ano)} rotuloAnterior={String(anterior)} />
        </Cartao>
      )}

      <Cartao
        className="mt-6"
        titulo="Reincidência"
        descricao="Quem voltou a ser remanejado. Reincidência na mesma região sugere que o posto não foi resolvido."
      >
        {reincidentes.length === 0 ? (
          <Vazio>Nenhum colaborador com mais de um caso em {ano}.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reincidentes.map((p) => (
              <li key={p.matricula} className="px-5 py-3">
                <a
                  href={`/colaboradores/${p.matricula}`}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  {p.nome}
                </a>
                <p className="mt-0.5 text-xs text-slate-500">
                  {p.eventos.length} casos
                  {p.intervaloDias !== null &&
                    ` · ${p.intervaloDias} dias entre o primeiro e o último`}
                  {p.mesmaRegiao && p.eventos[0].regiao && (
                    <span className="font-medium text-amber-700">
                      {" "}
                      · sempre em {p.eventos[0].regiao}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}

function SerieMensal({
  atual,
  anterior,
  rotuloAtual,
  rotuloAnterior,
}: {
  atual: number[];
  anterior: number[];
  rotuloAtual: string;
  rotuloAnterior: string;
}) {
  const maximo = Math.max(...atual, ...anterior, 1);

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
          {rotuloAtual}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
          {rotuloAnterior}
        </span>
      </div>

      <div className="rolagem-x">
        <div className="flex min-w-[34rem] items-end gap-2">
          {MESES_CURTOS.map((mes, i) => (
            <div key={mes} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-36 w-full items-end justify-center gap-1">
                <Coluna valor={anterior[i]} maximo={maximo} cor="bg-slate-300" />
                <Coluna valor={atual[i]} maximo={maximo} cor="bg-slate-800" />
              </div>
              <span className="text-xs text-slate-400">{mes}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Coluna({
  valor,
  maximo,
  cor,
}: {
  valor: number;
  maximo: number;
  cor: string;
}) {
  // A altura da barra é percentual, então o pai precisa de altura resolvível
  // (h-full), senão o flex-col colapsa e a barra some.
  return (
    <div className="flex h-full w-1/2 flex-col items-center justify-end">
      {valor > 0 && (
        <span className="mb-0.5 text-[10px] font-medium tabular-nums text-slate-500">
          {valor}
        </span>
      )}
      <div
        className={`w-full shrink-0 rounded-t ${cor}`}
        style={{
          height: `${(valor / maximo) * 92}%`,
          minHeight: valor > 0 ? 3 : 0,
        }}
      />
    </div>
  );
}

function ComparativoTipo({
  atual,
  anterior,
  rotuloAtual,
  rotuloAnterior,
}: {
  atual: Remanejamento[];
  anterior: Remanejamento[];
  rotuloAtual: string;
  rotuloAnterior: string;
}) {
  const tipos = [
    "clinico",
    "ocupacional",
    "acidente_trabalho",
    "acidente_domestico",
  ] as const;

  function pct(itens: Remanejamento[], tipo: string) {
    if (itens.length === 0) return 0;
    return (itens.filter((r) => r.tipo === tipo).length / itens.length) * 100;
  }

  return (
    <div className="rolagem-x">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-2.5 font-medium">Tipo</th>
            <th className="px-3 py-2.5 text-right font-medium">
              {rotuloAnterior}
            </th>
            <th className="px-3 py-2.5 text-right font-medium">{rotuloAtual}</th>
            <th className="px-5 py-2.5 text-right font-medium">Variação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tipos.map((t) => {
            const a = pct(anterior, t);
            const b = pct(atual, t);
            const delta = b - a;
            return (
              <tr key={t}>
                <td className="px-5 py-2.5 text-slate-700">{TIPO_ROTULO[t]}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {a.toFixed(0)}%
                </td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">
                  {b.toFixed(0)}%
                </td>
                <td
                  className={`px-5 py-2.5 text-right font-medium tabular-nums ${
                    Math.abs(delta) >= 20
                      ? "text-amber-700"
                      : "text-slate-400"
                  }`}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(0)} p.p.
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
