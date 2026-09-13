import FormularioLancamento from "@/components/FormularioLancamento";
import { Cabecalho } from "@/components/ui";
import {
  listarColaboradores,
  obterListas,
  sugestoesContraindicacao,
} from "@/lib/dados";

export default async function NovoLancamento() {
  const [listas, colaboradores, sugestoes] = await Promise.all([
    obterListas(),
    listarColaboradores(),
    sugestoesContraindicacao(),
  ]);

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
