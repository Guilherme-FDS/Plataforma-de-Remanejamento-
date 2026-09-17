import FormularioLogin from "@/components/FormularioLogin";
import Logo from "@/components/Logo";

export const metadata = { title: "Entrar" };

export default function Login({
  searchParams,
}: {
  searchParams: { de?: string; motivo?: string; erro?: string };
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

      {searchParams.motivo === "inatividade" && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-center text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
          Sessão encerrada por 15 minutos sem uso. Entre de novo.
        </p>
      )}

      {searchParams.erro === "link-invalido" && (
        <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-center text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
          Este link expirou ou já foi usado. Peça um novo convite ou link de
          redefinição de senha.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <FormularioLogin destino={destino} />
      </div>
    </div>
  );
}
