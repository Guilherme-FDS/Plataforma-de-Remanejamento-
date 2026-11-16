import { Barras, Cabecalho, Cartao, Indicador, Vazio } from "@/components/ui";
import {
  MESES_CURTOS,
  mesDe,
  TIPO_ROTULO,
  anoDe,
  anosDisponiveis,
  contarPor,
  estatisticaDuracao,
  incidenciaPorSetor,
  porMes,
  reincidencias,
} from "@/lib/calculos";
import { listarRemanejamentos, obterListasAdmin } from "@/lib/dados";
import type { Remanejamento } from "@/lib/tipos";


export const metadata = { title: "Indicadores" };

export default async function Indicadores({
  searchParams,
}: {
  searchParams: { ano?: string; turno?: string; mes?: string };
}) {
  const [todos, listas] = await Promise.all([
    listarRemanejamentos(),
    obterListasAdmin(),
  ]);
  const efetivoPorSetor = Object.fromEntries(
    listas.setores.map((s) => [s.nome, s.efetivo]),
  );
  const anos = anosDisponiveis(todos);

  // Filtro de turno: vale para todos os números e gráficos da tela e segue
  // junto nos links para a lista de casos.
  const turnos = [...new Set(todos.map((r) => r.turno).filter(Boolean))].sort() as string[];
  const turno = turnos.includes(searchParams.turno ?? "") ? searchParams.turno! : "";
  const base = turno ? todos.filter((r) => r.turno === turno) : todos;
  const qTurno = turno ? `&turno=${encodeURIComponent(turno)}` : "";
  const linkIndicadores = (a: number, t: string, m?: number) =>
    `/indicadores?ano=${a}${t ? `&turno=${encodeURIComponent(t)}` : ""}${m ? `&mes=${m}` : ""}`;
  const ano = Number(searchParams.ano) || anos[0];
  const anterior = ano - 1;

  const doAno = base.filter((r) => anoDe(r) === ano);
  const doAnterior = base.filter((r) => anoDe(r) === anterior);

  const serieAno = porMes(base, ano);
  const serieAnterior = porMes(base, anterior);

  // Mês do gráfico setor × turno: o pedido na URL, senão o último mês do
  // ano com casos.
  const mesUrl = Number(searchParams.mes);
  const mesSel =
    mesUrl >= 1 && mesUrl <= 12
      ? mesUrl
      : serieAno.reduce((u, v, i) => (v > 0 ? i + 1 : u), new Date().getMonth() + 1);

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
        acao={
          <div className="flex gap-1.5">
            {anos.map((a) => (
              <a
                key={a}
                href={linkIndicadores(a, turno)}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  a === ano
                    ? "bg-gtf-700 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
                }`}
              >
                {a}
              </a>
            ))}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Turno
        </span>
        {["", ...turnos].map((t) => (
          <a
            key={t || "todos"}
            href={linkIndicadores(ano, t, mesSel)}
            aria-current={t === turno ? "true" : undefined}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition ${
              t === turno
                ? "border-gtf-700 bg-gtf-700 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {t || "Todos"}
          </a>
        ))}
        {turno && (
          <span className="ml-auto text-xs text-slate-500">
            Mostrando só o {turno} turno
          </span>
        )}
      </div>

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
      >
        <SerieMensal
          atual={serieAno}
          anterior={serieAnterior}
          rotuloAtual={String(ano)}
          rotuloAnterior={String(anterior)}
          href={(a, mes) => `/remanejamentos?ano=${a}&mes=${mes}${qTurno}`}
          anoAtual={ano}
        />
      </Cartao>

      <Cartao
        className="mt-6"
        titulo={`Casos do mês por setor e turno — ${MESES_CURTOS[mesSel - 1]}/${ano}`}
        descricao="Casos que começaram no mês, separados pelo turno do colaborador."
      >
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-5 py-3">
          {MESES_CURTOS.map((m, i) => (
            <a
              key={m}
              href={linkIndicadores(ano, turno, i + 1)}
              aria-current={i + 1 === mesSel ? "true" : undefined}
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition ${
                i + 1 === mesSel
                  ? "bg-gtf-700 text-white"
                  : serieAno[i] > 0
                    ? "text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
                    : "text-slate-400"
              }`}
            >
              {m}
              <span className="ml-1 tabular-nums opacity-70">{serieAno[i]}</span>
            </a>
          ))}
        </div>
        <SetorTurnoMes
          itens={doAno.filter((r) => mesDe(r) === mesSel)}
          turnos={turno ? [turno] : turnos}
          todosTurnos={turnos}
          href={(s, t) =>
            `/remanejamentos?setor=${encodeURIComponent(s)}&turno=${encodeURIComponent(t)}&ano=${ano}&mes=${mesSel}`
          }
        />
      </Cartao>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Região do corpo">
          <Barras
            itens={contarPor(doAno, (r) => r.regiao)}
            href={(r) =>
              `/remanejamentos?regiao=${encodeURIComponent(r)}&ano=${ano}${qTurno}`
            }
          />
        </Cartao>

        <Cartao titulo="Setor">
          <Barras
            itens={contarPor(doAno, (r) => r.setor)}
            href={(s) =>
              `/remanejamentos?setor=${encodeURIComponent(s)}&ano=${ano}${qTurno}`
            }
          />
        </Cartao>
      </div>

      <Cartao
        className="mt-6"
        titulo="Incidência por 100 colaboradores"
        descricao={
          "Só compara setores de tamanhos diferentes de verdade. Setor sem efetivo cadastrado (Config. → Setores) some da conta, não some da lista." +
          (turno
            ? " Atenção: o efetivo cadastrado é do setor inteiro (todos os turnos), então com um turno filtrado a taxa fica subestimada."
            : "")
        }
      >
        <IncidenciaSetores itens={doAno} efetivoPorSetor={efetivoPorSetor} ano={ano} qTurno={qTurno} />
      </Cartao>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Cartao titulo="Tipo">
          <Barras
            itens={contarPor(doAno, (r) => TIPO_ROTULO[r.tipo])}
            href={(label) => {
              const id =
                Object.entries(TIPO_ROTULO).find(([, v]) => v === label)?.[0] ??
                label;
              return `/remanejamentos?tipo=${encodeURIComponent(id)}&ano=${ano}${qTurno}`;
            }}
          />
        </Cartao>

        <Cartao titulo="Turno">
          <Barras
            itens={contarPor(doAno, (r) => r.turno)}
            href={(t) =>
              `/remanejamentos?turno=${encodeURIComponent(t)}&ano=${ano}`
            }
          />
        </Cartao>

        <Cartao titulo="Profissional responsável">
          <Barras itens={contarPor(doAno, (r) => r.profissional)} />
        </Cartao>
      </div>

      {doAnterior.length > 0 && (
        <Cartao
          className="mt-6"
          titulo={`Como a classificação mudou entre ${anterior} e ${ano}`}
        >
          <ComparativoTipo atual={doAno} anterior={doAnterior} rotuloAtual={String(ano)} rotuloAnterior={String(anterior)} />
        </Cartao>
      )}

      <Cartao
        className="mt-6"
        titulo="Reincidência"
      >
        {reincidentes.length === 0 ? (
          <Vazio>Nenhum colaborador com mais de um caso em {ano}.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reincidentes.map((p) => (
              <li key={p.colaboradorId} className="px-5 py-3">
                <a
                  href={`/colaboradores/${p.colaboradorId}`}
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

function IncidenciaSetores({
  itens,
  efetivoPorSetor,
  ano,
  qTurno,
}: {
  itens: Remanejamento[];
  efetivoPorSetor: Record<string, number | null>;
  ano: number;
  qTurno: string;
}) {
  const linhas = incidenciaPorSetor(itens, efetivoPorSetor);

  if (linhas.length === 0) {
    return <Vazio>Sem casos em {ano}.</Vazio>;
  }

  return (
    <ul className="divide-y divide-slate-50">
      {linhas.map((l) => (
        <li key={l.setor} className="px-5 py-2.5">
          <a
            href={`/remanejamentos?setor=${encodeURIComponent(l.setor)}&ano=${ano}${qTurno}`}
            className="flex items-baseline justify-between gap-3 hover:text-gtf-700"
          >
            <span className="truncate text-sm text-slate-700">{l.setor}</span>
            <span className="shrink-0 text-sm tabular-nums text-slate-500">
              {l.taxa !== null ? (
                <>
                  <strong className="font-semibold text-slate-900">
                    {l.taxa.toFixed(1)}
                  </strong>
                  /100 · {l.casos} caso{l.casos === 1 ? "" : "s"} de {l.efetivo}
                </>
              ) : (
                <>
                  {l.casos} caso{l.casos === 1 ? "" : "s"} ·{" "}
                  <span className="text-slate-500">sem efetivo</span>
                </>
              )}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function SerieMensal({
  atual,
  anterior,
  rotuloAtual,
  rotuloAnterior,
  href,
  anoAtual,
}: {
  atual: number[];
  anterior: number[];
  rotuloAtual: string;
  rotuloAnterior: string;
  href: (ano: number, mes: number) => string;
  anoAtual: number;
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
                <Coluna
                  valor={anterior[i]}
                  maximo={maximo}
                  cor="bg-slate-300 group-hover:bg-slate-400"
                  href={href(anoAtual - 1, i + 1)}
                  titulo={`${mes}/${rotuloAnterior}: ${anterior[i]} caso(s)`}
                />
                <Coluna
                  valor={atual[i]}
                  maximo={maximo}
                  cor="bg-slate-800 group-hover:bg-gtf-700"
                  href={href(anoAtual, i + 1)}
                  titulo={`${mes}/${rotuloAtual}: ${atual[i]} caso(s)`}
                />
              </div>
              <span className="text-xs text-slate-500">{mes}</span>
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
  href,
  titulo,
}: {
  valor: number;
  maximo: number;
  cor: string;
  href: string;
  titulo: string;
}) {
  // A altura da barra é percentual, então o pai precisa de altura resolvível
  // (h-full), senão o flex-col colapsa e a barra some.
  // Sem casos, não há o que listar: fica como div, sem link.
  const Tag = valor > 0 ? "a" : "div";
  return (
    <Tag
      {...(valor > 0 ? { href, title: titulo } : {})}
      className="group flex h-full w-1/2 flex-col items-center justify-end"
    >
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
    </Tag>
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
                      : "text-slate-500"
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

/* ------------------------------------------------- setor × turno no mês
 * Barras agrupadas: um grupo por setor, uma barra por turno. A cor segue o
 * turno (posição dele na lista completa), então filtrar não repinta nada.
 * Cores validadas para daltonismo (claro e escuro); o tom aqua fica abaixo
 * de 3:1 no fundo claro, por isso todo valor tem rótulo e existe a tabela.
 */
const CORES_TURNO = ["bg-[var(--serie-1)]", "bg-[var(--serie-2)]", "bg-[var(--serie-3)]"];

function SetorTurnoMes({
  itens,
  turnos,
  todosTurnos,
  href,
}: {
  itens: Remanejamento[];
  turnos: string[];
  todosTurnos: string[];
  href: (setor: string, turno: string) => string;
}) {
  if (itens.length === 0) return <Vazio>Nenhum caso neste mês.</Vazio>;

  const cor = (t: string) => CORES_TURNO[todosTurnos.indexOf(t) % CORES_TURNO.length];
  const conta = new Map<string, Map<string, number>>();
  for (const r of itens) {
    const s = r.setor ?? "Sem setor";
    const t = r.turno ?? "";
    if (!conta.has(s)) conta.set(s, new Map());
    conta.get(s)!.set(t, (conta.get(s)!.get(t) ?? 0) + 1);
  }
  const total = (s: string) => [...conta.get(s)!.values()].reduce((a, b) => a + b, 0);
  const setores = [...conta.keys()].sort((a, b) => total(b) - total(a) || a.localeCompare(b, "pt-BR"));
  const max = Math.max(...setores.flatMap((s) => turnos.map((t) => conta.get(s)!.get(t) ?? 0)), 1);
  const porTurno = (t: string) => itens.filter((r) => r.turno === t).length;
  const semTurno = itens.filter((r) => !r.turno || !turnos.includes(r.turno)).length;

  return (
    <div className="px-5 py-4">
      {/* Legenda com total por turno */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
        {turnos.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${cor(t)}`} />
            {t} turno
            <strong className="font-semibold tabular-nums text-slate-900">{porTurno(t)}</strong>
          </span>
        ))}
        <span className="text-slate-500">
          Total <strong className="font-semibold tabular-nums text-slate-900">{itens.length}</strong>
        </span>
        {semTurno > 0 && turnos.length > 1 && (
          <span className="text-xs text-slate-500">({semTurno} sem turno informado)</span>
        )}
      </div>

      <div className="rolagem-x">
        <div className="flex min-w-max items-end gap-3 border-b border-slate-200 pt-5">
          {setores.map((s) => (
            <div key={s} className="flex w-[4.5rem] flex-col items-center">
              <div className="flex h-44 items-end gap-0.5">
                {turnos.map((t) => {
                  const v = conta.get(s)!.get(t) ?? 0;
                  return (
                    <a
                      key={t}
                      href={v > 0 ? href(s, t) : undefined}
                      title={`${s} · ${t} turno: ${v} caso${v !== 1 ? "s" : ""}`}
                      className="group flex h-full w-3.5 flex-col items-center justify-end"
                    >
                      {v > 0 && (
                        <>
                          <span className="mb-0.5 text-[10px] font-medium tabular-nums text-slate-600">{v}</span>
                          <span
                            className={`w-full rounded-t-[4px] transition group-hover:opacity-80 ${cor(t)}`}
                            style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}
                          />
                        </>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex min-w-max gap-3 pt-1.5">
          {setores.map((s) => (
            <p key={s} title={s} className="line-clamp-2 w-[4.5rem] text-center text-[11px] leading-tight text-slate-500">
              {s}
            </p>
          ))}
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
          Ver em tabela
        </summary>
        <div className="rolagem-x mt-2">
          <table className="w-full min-w-[24rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Setor</th>
                {turnos.map((t) => (
                  <th key={t} className="py-2 pr-3 text-right font-medium">{t}</th>
                ))}
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {setores.map((s) => (
                <tr key={s}>
                  <td className="py-1.5 pr-3 text-slate-700">{s}</td>
                  {turnos.map((t) => (
                    <td key={t} className="py-1.5 pr-3 text-right tabular-nums text-slate-600">
                      {conta.get(s)!.get(t) ?? 0}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">{total(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
