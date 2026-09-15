import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { obterListasAdmin, perfilAtual } from "@/lib/dados";
import { listarUsuarios } from "@/app/actions/usuarios";
import AdminCliente from "./AdminCliente";

export default async function PaginaAdmin() {
  const perfil = await perfilAtual();

  // Visualizador não acessa configurações.
  if (perfil?.papel !== "operador") redirect("/");

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
