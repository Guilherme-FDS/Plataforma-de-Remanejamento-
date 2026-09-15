import Link from "next/link";
import { Barras, Cabecalho, Cartao, Indicador, Selo, Vazio } from "@/components/ui";
import {
  clusters,
  contarPor,
  descreverSegmento,
  diasAteFim,
  estaAberto,
  formatarData,
  formatarDataObj,
  hoje,
  previsaoFim,
  reincidencias,
  situacaoDe,
} from "@/lib/calculos";
import { listarRemanejamentos } from "@/lib/dados";
import type { Remanejamento } from "@/lib/tipos";

export default async function Painel() {
  const ref = hoje();
  const todos = await listarRemanejamentos();
  const abertos = todos.filter((r) => estaAberto(r, ref));

  const aEncerrar = abertos.filter((r) => situacaoDe(r, ref) === "a_encerrar");
  const semPrevisao = abertos.filter(
    (r) => situacaoDe(r, ref) === "sem_previsao",
  );
  const permanentes = abertos.filter((r) => situacaoDe(r, ref) === "permanente");

  const vencendo = abertos
    .filter((r) => {
      const d = diasAteFim(r, ref);
      return d !== null && d >= 0 && d <= 30;
    })
    .sort((a, b) => (diasAteFim(a, ref) ?? 0) - (diasAteFim(b, ref) ?? 0));

  const focos = clusters(todos, 180, 3, ref);
  const reincidentes = reincidencias(todos);

  return (
    <>
      <Cabecalho titulo="Painel" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador
          rotulo="Vigentes"
          valor={abertos.length}
          nota={`de ${todos.length} registros no histórico`}
          href="/remanejamentos?situacao=abertos"
        />
        <Indicador
          rotulo="A encerrar"
          valor={aEncerrar.length}
          nota="prazo venceu e ninguém confirmou o desfecho"
          destaque={aEncerrar.length > 0 ? "atencao" : undefined}
          href="/remanejamentos?situacao=a_encerrar"
        />
        <Indicador
          rotulo="Sem previsão"
          valor={semPrevisao.length}
          nota="falta a duração; não dá para acompanhar"
          destaque={semPrevisao.length > 0 ? "alerta" : undefined}
          href="/remanejamentos?situacao=sem_previsao"
        />
        <Indicador
          rotulo="Permanentes"
          valor={permanentes.length}
          nota="restrição sem prazo, exige reavaliação periódica"
          href="/remanejamentos?situacao=permanente"
        />
      </div>

      {focos.length > 0 && (
        <Cartao
          className="mt-6"
          titulo="Focos ergonômicos"
          descricao="Três ou mais casos da mesma região do corpo, no mesmo setor, nos últimos 180 dias. É o padrão que justifica análise ergonômica — não o caso isolado."
        >
          <ul className="divide-y divide-slate-100">
            {focos.map((f) => (
              <li
                key={`${f.setor}-${f.regiao}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {f.regiao}{" "}
                    <span className="font-normal text-slate-400">em</span>{" "}
                    {f.setor}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {f.eventos
                      .map((e) => e.nome.split(" ")[0])
                      .slice(0, 6)
                      .join(", ")}
                    {f.eventos.length > 6 && ` +${f.eventos.length - 6}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-sm font-semibold tabular-nums text-amber-800 ring-1 ring-inset ring-amber-600/30">
                    {f.total} casos
                  </span>
                  <Link
                    href={`/remanejamentos?setor=${encodeURIComponent(f.setor)}&regiao=${encodeURIComponent(f.regiao)}`}
                    className="text-sm font-medium text-slate-500 hover:text-slate-900"
                  >
                    Ver
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Cartao
          titulo="Precisa de ação"
          descricao="Prazo vencido sem desfecho registrado, ou lançamento sem duração."
        >
          {aEncerrar.length + semPrevisao.length === 0 ? (
            <Vazio>Nenhuma pendência. </Vazio>
          ) : (
            <ListaCasos
              itens={[...semPrevisao, ...aEncerrar]}
              ref_={ref}
              mostrarAtraso
            />
          )}
        </Cartao>

        <Cartao
          titulo="Vence em até 30 dias"
          descricao="Antecipe a reavaliação antes do prazo terminar."
        >
          {vencendo.length === 0 ? (
            <Vazio>Nada vencendo no próximo mês.</Vazio>
          ) : (
            <ListaCasos itens={vencendo} ref_={ref} />
          )}
        </Cartao>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Cartao
          titulo="Casos por setor"
          descricao="Somente casos em aberto."
        >
          <Barras
            itens={contarPor(abertos, (r) => r.setor).slice(0, 8)}
            href={(s) => `/remanejamentos?setor=${encodeURIComponent(s)}`}
          />
        </Cartao>

        <Cartao
          titulo="Casos por região do corpo"
          descricao="Onde o corpo está sendo exigido."
        >
          <Barras
            itens={contarPor(abertos, (r) => r.regiao).slice(0, 8)}
            href={(s) => `/remanejamentos?regiao=${encodeURIComponent(s)}`}
          />
        </Cartao>

        <Cartao
          titulo="Reincidência"
          descricao="Colaboradores com mais de um remanejamento."
        >
          {reincidentes.length === 0 ? (
            <Vazio>Nenhuma reincidência registrada.</Vazio>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reincidentes.slice(0, 8).map((p) => (
                <li key={p.colaboradorId}>
                  <Link
                    href={`/colaboradores/${p.colaboradorId}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800">
                        {p.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.eventos.length} eventos
                        {p.mesmaRegiao && p.eventos[0].regiao && (
                          <span className="ml-1 font-medium text-amber-700">
                            · mesma região ({p.eventos[0].regiao})
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-slate-400">
                      {p.intervaloDias !== null ? `${p.intervaloDias}d` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}

function ListaCasos({
  itens,
  ref_,
  mostrarAtraso,
}: {
  itens: Remanejamento[];
  ref_: Date;
  mostrarAtraso?: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {itens.map((r) => {
        const dias = diasAteFim(r, ref_);
        const fim = previsaoFim(r);
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {r.matricula ? (
                  <Link
                    href={`/colaboradores/${r.colaboradorId}`}
                    className="truncate text-sm font-medium text-slate-900 hover:underline"
                  >
                    {r.nome}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium text-slate-900">
                    {r.nome}
                  </span>
                )}
                <Selo situacao={situacaoDe(r, ref_)} />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {[r.setor, r.turno, descreverSegmento(r)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="text-right text-xs">
              {fim ? (
                <>
                  <p className="tabular-nums text-slate-600">
                    {formatarDataObj(fim)}
                  </p>
                  {dias !== null && (
                    <p
                      className={
                        dias < 0
                          ? "font-medium text-amber-700"
                          : "text-slate-400"
                      }
                    >
                      {dias < 0
                        ? mostrarAtraso
                          ? `${Math.abs(dias)}d em atraso`
                          : "vencido"
                        : `em ${dias}d`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-400">
                  início {formatarData(r.dataInicio)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
