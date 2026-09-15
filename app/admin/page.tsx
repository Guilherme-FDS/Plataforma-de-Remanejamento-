import { Cabecalho } from "@/components/ui";
import { obterListasAdmin } from "@/lib/dados";
import { listarUsuarios } from "@/app/actions/usuarios";
import AdminCliente from "./AdminCliente";

export default async function PaginaAdmin() {
  const [listas, usuarios] = await Promise.all([
    obterListasAdmin(),
    listarUsuarios(),
  ]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Cabecalho titulo="Configurações" />
      <div className="mt-6">
        <AdminCliente listas={listas} usuarios={usuarios} />
      </div>
    </main>
  );
}
