import FormularioLogin from "@/components/FormularioLogin";

export default function Login({
  searchParams,
}: {
  searchParams: { de?: string };
}) {
  const destino = searchParams.de?.startsWith("/") ? searchParams.de : "/";

  return (
    <div className="mx-auto max-w-sm py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-lg font-bold text-white">
          R
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Plataforma de Remanejamento
        </h1>
        <p className="mt-1 text-sm text-slate-500">Maringá</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <FormularioLogin destino={destino} />
      </div>
    </div>
  );
}
