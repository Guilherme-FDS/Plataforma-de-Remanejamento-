/**
 * Camada de dados — ÚNICO ponto de acesso às informações.
 *
 * No protótipo lê os JSON gerados por scripts/importar.py. Quando o projeto
 * Supabase existir, só este arquivo muda: as assinaturas abaixo viram
 * consultas ao Postgres e nenhuma tela precisa ser tocada.
 */
import colaboradoresJson from "@/dados/colaboradores.json";
import listasJson from "@/dados/listas.json";
import pendenciasJson from "@/dados/pendencias.json";
import remanejamentosJson from "@/dados/remanejamentos.json";
import type {
  Colaborador,
  Listas,
  Pendencia,
  Remanejamento,
} from "./tipos";

export function listarRemanejamentos(): Remanejamento[] {
  return remanejamentosJson as Remanejamento[];
}

export function listarColaboradores(): Colaborador[] {
  return colaboradoresJson as Colaborador[];
}

export function listarPendencias(): Pendencia[] {
  return pendenciasJson as Pendencia[];
}

export function obterListas(): Listas {
  return listasJson as Listas;
}

export function obterColaborador(matricula: number): Colaborador | undefined {
  return listarColaboradores().find((c) => c.matricula === matricula);
}

export function historicoDoColaborador(matricula: number): Remanejamento[] {
  return listarRemanejamentos()
    .filter((r) => r.matricula === matricula)
    .sort((a, b) => (b.dataInicio ?? "").localeCompare(a.dataInicio ?? ""));
}

/**
 * Contraindicações já escritas na planilha, agrupadas por segmento. Vira
 * sugestão no formulário: a mesma frase ("evitar elevar os braços acima da
 * linha do ombro") foi redigitada dezenas de vezes.
 */
export function sugestoesContraindicacao(): Record<string, string[]> {
  const porSegmento = new Map<string, Map<string, number>>();

  for (const r of listarRemanejamentos()) {
    if (!r.segmento || !r.contraindicacao) continue;
    const texto = r.contraindicacao.trim().replace(/\s+/g, " ");
    if (texto.length < 12 || texto.length > 160) continue;

    const mapa = porSegmento.get(r.segmento) ?? new Map<string, number>();
    const chave = texto.toLocaleUpperCase("pt-BR");
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    porSegmento.set(r.segmento, mapa);
  }

  const saida: Record<string, string[]> = {};
  for (const [segmento, mapa] of porSegmento) {
    saida[segmento] = [...mapa.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([texto]) => texto);
  }
  return saida;
}
