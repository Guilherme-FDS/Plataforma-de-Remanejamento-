import FormularioLogin from "@/components/FormularioLogin";
import Logo from "@/components/Logo";

export const metadata = { title: "Entrar" };

export default function Login({
  searchParams,
}: {
  searchParams: { de?: string };
}) {
  const destino = searchParams.de?.startsWith("/") ? searchParams.de : "/";

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center py-8">
      <div className="mb-8 text-center">
        <Logo className="mx-auto mb-5 h-12 w-auto text-gtf-700" />
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Plataforma de Remanejamento
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Medicina Ocupacional e Ergonomia · Maringá
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <FormularioLogin destino={destino} />
      </div>
    </div>
  );
}
