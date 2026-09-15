import { Cabecalho } from "@/components/ui";
import { obterListasAdmin } from "@/lib/dados";
import AdminCliente from "./AdminCliente";

export default async function PaginaAdmin() {
  const listas = await obterListasAdmin();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Cabecalho titulo="Configurações" />
      <div className="mt-6">
        <AdminCliente listas={listas} />
      </div>
    </main>
  );
}
