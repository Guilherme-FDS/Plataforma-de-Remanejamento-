import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, Cartao, Etiqueta, Indicador, Selo } from "@/components/ui";
import {
  TIPO_ROTULO,
  descreverDuracao,
  descreverSegmento,
  estaAberto,
  formatarData,
  formatarDataObj,
  hoje,
  previsaoFim,
  situacaoDe,
} from "@/lib/calculos";
import { historicoDoColaborador, obterColaborador } from "@/lib/dados";

export default function FichaColaborador({
  params,
}: {
  params: { matricula: string };
}) {
  const matricula = Number(params.matricula);
  const colaborador = obterColaborador(matricula);
  if (!colaborador) notFound();

  const ref = hoje();
  const historico = historicoDoColaborador(matricula);
  const abertos = historico.filter((r) => estaAberto(r, ref));
  const regioes = [...new Set(historico.map((r) => r.regiao).filter(Boolean))];
  const diasTotais = historico
    .filter((r) => r.duracaoTipo === "dias" && r.duracaoDias)
    .reduce((s, r) => s + (r.duracaoDias ?? 0), 0);

  const reincidenteMesmaRegiao = historico.length > 1 && regioes.length === 1;

  return (
    <>
      <Cabecalho
        titulo={colaborador.nome}
        descricao={`Matrícula ${colaborador.matricula} · ${colaborador.setor ?? "setor não informado"} · ${colaborador.turno ?? "turno não informado"}`}
        acao={
          <Link
            href="/remanejamentos"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Voltar
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador rotulo="Remanejamentos" valor={historico.length} />
        <Indicador
          rotulo="Em aberto"
          valor={abertos.length}
          destaque={abertos.length > 0 ? "atencao" : undefined}
        />
        <Indicador
          rotulo="Dias de restrição"
          valor={diasTotais}
          nota="soma dos prazos temporários"
        />
        <Indicador
          rotulo="Regiões afetadas"
          valor={regioes.length}
          nota={regioes.join(", ") || undefined}
        />
      </div>

      {reincidenteMesmaRegiao && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-900">
            Reincidência na mesma região ({regioes[0]})
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            {historico.length} remanejamentos pelo mesmo segmento. O retorno ao
            posto anterior tende a repetir o quadro — vale revisar o posto, não
            só o prazo.
          </p>
        </div>
      )}

      <Cartao className="mt-6" titulo="Histórico">
        <ol className="divide-y divide-slate-100">
          {historico.map((r) => {
            const { data: fim } = previsaoFim(r);
            return (
              <li key={r.linhaOrigem} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    {formatarData(r.dataInicio)}
                  </span>
                  <Selo situacao={situacaoDe(r, ref)} />
                  <Etiqueta>{TIPO_ROTULO[r.tipo]}</Etiqueta>
                  {r.regiao && <Etiqueta tom="escuro">{r.regiao}</Etiqueta>}
                </div>

                <p className="mt-1.5 text-sm text-slate-900">
                  {descreverSegmento(r)}
                  {r.causa && (
                    <span className="text-slate-500"> — {r.causa}</span>
                  )}
                </p>

                {r.contraindicacao && (
                  <p className="mt-1 text-sm leading-snug text-slate-600">
                    <span className="font-medium">Contraindicação: </span>
                    {r.contraindicacao}
                  </p>
                )}

                {r.observacoes && (
                  <p className="mt-1 text-sm leading-snug text-slate-500">
                    {r.observacoes}
                  </p>
                )}

                <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <div>
                    <dt className="inline font-medium">Duração: </dt>
                    <dd className="inline">{descreverDuracao(r)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Previsão: </dt>
                    <dd className="inline tabular-nums">
                      {formatarDataObj(fim)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Setor: </dt>
                    <dd className="inline">{r.setor ?? "—"}</dd>
                  </div>
                  {r.supervisor && (
                    <div>
                      <dt className="inline font-medium">Supervisor: </dt>
                      <dd className="inline">{r.supervisor}</dd>
                    </div>
                  )}
                  {r.profissional && (
                    <div>
                      <dt className="inline font-medium">Responsável: </dt>
                      <dd className="inline">{r.profissional}</dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>
      </Cartao>
    </>
  );
}
