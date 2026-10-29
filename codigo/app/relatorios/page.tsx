import { Cabecalho } from "@/components/ui";
import { relatorioDeParams } from "@/lib/calculos";
import { listarRemanejamentos } from "@/lib/dados";
import RelatorioCliente from "./RelatorioCliente";


export const metadata = { title: "Relatórios" };

export default async function Relatorios({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const todos = await listarRemanejamentos();

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        descricao="Os filtros aplicam na hora. O PDF e o XLSX levam exatamente a lista da tela."
      />
      <RelatorioCliente todos={todos} inicial={relatorioDeParams(searchParams)} />
    </>
  );
}
