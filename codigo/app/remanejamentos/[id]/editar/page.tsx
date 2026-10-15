import { notFound, redirect } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import BotaoVoltar from "@/components/BotaoVoltar";
import FormularioEdicao from "@/components/FormularioEdicao";

export const metadata = { title: "Editar caso" };
import { obterRemanejamento, obterListas, perfilAtual } from "@/lib/dados";

export default async function PaginaEditar({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [remanj, listas, perfil] = await Promise.all([
    obterRemanejamento(id),
    obterListas(),
    perfilAtual(),
  ]);

  // Visualizador não edita — bloqueia acesso direto pela URL. Lançador e
  // operador podem.
  if (perfil?.papel !== "lancador" && perfil?.papel !== "operador")
    redirect("/remanejamentos");

  if (!remanj) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Cabecalho
        titulo={`Editar — ${remanj.nome}`}
        acao={<BotaoVoltar padrao="/remanejamentos" rotulo="Cancelar" />}
      />
      <div className="mt-6">
        <FormularioEdicao remanj={remanj} listas={listas} />
      </div>
    </div>
  );
}
