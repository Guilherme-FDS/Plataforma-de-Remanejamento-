import { redirect } from "next/navigation";
import FormularioLancamento from "@/components/FormularioLancamento";
import { Cabecalho } from "@/components/ui";
import {
  listarColaboradores,
  obterListas,
  perfilAtual,
  sugestoesContraindicacao,
} from "@/lib/dados";

export default async function NovoLancamento() {
  const [listas, colaboradores, sugestoes, perfil] = await Promise.all([
    obterListas(),
    listarColaboradores(),
    sugestoesContraindicacao(),
    perfilAtual(),
  ]);

  // Visualizador não lança — bloqueia acesso direto pela URL. Lançador e
  // operador podem.
  if (perfil?.papel !== "lancador" && perfil?.papel !== "operador")
    redirect("/remanejamentos");

  return (
    <div className="mx-auto max-w-3xl">
      <Cabecalho
        titulo="Novo lançamento"
        descricao="Digite a matrícula: setor, turno e supervisor vêm preenchidos. A previsão de término é calculada — nunca digitada."
      />
      <FormularioLancamento
        colaboradores={colaboradores}
        listas={listas}
        sugestoes={sugestoes}
      />
    </div>
  );
}
