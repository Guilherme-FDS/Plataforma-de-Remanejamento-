import Link from "next/link";
import type { ReactNode } from "react";
import { SITUACAO_COR, SITUACAO_ROTULO } from "@/lib/calculos";
import type { Situacao } from "@/lib/tipos";

export function Cabecalho({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  );
}

export function Cartao({
  titulo,
  descricao,
  children,
  className = "",
}: {
  titulo?: string;
  descricao?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white ${className}`}
    >
      {titulo && (
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
          {descricao && (
            <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Indicador({
  rotulo,
  valor,
  nota,
  destaque,
  href,
}: {
  rotulo: string;
  valor: ReactNode;
  nota?: string;
  destaque?: "alerta" | "atencao";
  href?: string;
}) {
  const cor =
    destaque === "alerta"
      ? "border-rose-200 bg-rose-50"
      : destaque === "atencao"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  const conteudo = (
    <div className={`rounded-xl border p-4 ${cor} h-full`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {rotulo}
      </p>
      <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {valor}
      </p>
      {nota && <p className="mt-1 text-xs leading-snug text-slate-500">{nota}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="block transition hover:opacity-80">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

export function Selo({ situacao }: { situacao: Situacao }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SITUACAO_COR[situacao]}`}
    >
      {SITUACAO_ROTULO[situacao]}
    </span>
  );
}

export function Etiqueta({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "escuro";
}) {
  const cor =
    tom === "escuro"
      ? "bg-slate-800 text-white"
      : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${cor}`}
    >
      {children}
    </span>
  );
}

/** Barra horizontal proporcional — usada nos rankings de indicadores. */
export function Barras({
  itens,
  total,
  href,
}: {
  itens: { rotulo: string; total: number }[];
  total?: number;
  href?: (rotulo: string) => string;
}) {
  const maximo = Math.max(...itens.map((i) => i.total), 1);
  const soma = total ?? itens.reduce((s, i) => s + i.total, 0);

  if (itens.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-400">Sem dados.</p>;
  }

  return (
    <ul className="divide-y divide-slate-50">
      {itens.map((item) => {
        const pct = soma > 0 ? (item.total / soma) * 100 : 0;
        const linha = (
          <div className="px-5 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-slate-700">
                {item.rotulo}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                {item.total}
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  {pct.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gtf-700"
                style={{ width: `${(item.total / maximo) * 100}%` }}
              />
            </div>
          </div>
        );
        return (
          <li key={item.rotulo}>
            {href ? (
              <Link href={href(item.rotulo)} className="block hover:bg-slate-50">
                {linha}
              </Link>
            ) : (
              linha
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-sm text-slate-400">{children}</p>
  );
}
