import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import FormularioEdicao from "@/components/FormularioEdicao";
import { obterRemanejamento, obterListas } from "@/lib/dados";

export default async function PaginaEditar({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [remanj, listas] = await Promise.all([
    obterRemanejamento(id),
    obterListas(),
  ]);

  if (!remanj) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Cabecalho titulo={`Editar — ${remanj.nome}`} />
      <div className="mt-6">
        <FormularioEdicao remanj={remanj} listas={listas} />
      </div>
    </main>
  );
}
