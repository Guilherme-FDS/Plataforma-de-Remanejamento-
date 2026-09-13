import FormularioLancamento from "@/components/FormularioLancamento";
import { Cabecalho } from "@/components/ui";
import {
  listarColaboradores,
  obterListas,
  sugestoesContraindicacao,
} from "@/lib/dados";

export default function NovoLancamento() {
  const listas = obterListas();

  return (
    <div className="mx-auto max-w-3xl">
      <Cabecalho
        titulo="Novo lançamento"
        descricao="Digite a matrícula: setor, turno e supervisor vêm preenchidos. A previsão de término é calculada — nunca digitada."
      />
      <FormularioLancamento
        colaboradores={listarColaboradores()}
        listas={listas}
        sugestoes={sugestoesContraindicacao()}
      />
    </div>
  );
}
