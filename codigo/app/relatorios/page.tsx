import { Cabecalho } from "@/components/ui";
import { listarRemanejamentos, obterListas } from "@/lib/dados";
import RelatorioCliente from "./RelatorioCliente";

export default async function Relatorios() {
  const [todos, listas] = await Promise.all([
    listarRemanejamentos(),
    obterListas(),
  ]);

  return (
    <>
      <Cabecalho titulo="Relatórios" />
      <RelatorioCliente todos={todos} setores={listas.setores} />
    </>
  );
}
