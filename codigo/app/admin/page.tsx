import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { listarTodasUnidades, obterListasAdmin, perfilAtual } from "@/lib/dados";
import { listarUsuarios } from "@/app/actions/usuarios";
import AdminCliente from "./AdminCliente";

export default async function PaginaAdmin() {
  const perfil = await perfilAtual();

  // Visualizador não acessa configurações. Lançador e operador podem —
  // dentro da tela, ações de escrita nas listas continuam exigindo
  // operador (checado nos Server Actions), e a aba Usuários exige admin.
  if (perfil?.papel !== "lancador" && perfil?.papel !== "operador")
    redirect("/");

  const [listas, usuarios, unidades] = await Promise.all([
    obterListasAdmin(),
    listarUsuarios(),
    listarTodasUnidades(),
  ]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Cabecalho titulo="Configurações" />
      <div className="mt-6">
        <AdminCliente listas={listas} usuarios={usuarios} unidades={unidades} />
      </div>
    </main>
  );
}
