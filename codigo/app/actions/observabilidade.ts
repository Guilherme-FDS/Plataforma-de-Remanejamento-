"use server";

import { clienteServidor } from "@/lib/supabase-servidor";

export interface ErroRegistrado {
  id: number;
  ocorridoEm: string;
  contexto: string;
  mensagem: string;
  rota: string | null;
  usuarioNome: string | null;
}

/**
 * Últimos erros registrados (migration 0015). Devolve lista vazia pra
 * quem não é admin — a policy `erros_aplicacao_select` já barra a
 * consulta, isto só evita expor "sem permissão" numa tela que devia
 * simplesmente não aparecer.
 */
export async function listarErrosRecentes(): Promise<ErroRegistrado[]> {
  const supabase = clienteServidor();
  const { data, error } = await supabase
    .from("erros_aplicacao")
    .select("id, ocorrido_em, contexto, mensagem, rota, perfis(nome)")
    .order("ocorrido_em", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (
    data as unknown as {
      id: number;
      ocorrido_em: string;
      contexto: string;
      mensagem: string;
      rota: string | null;
      perfis: { nome: string } | null;
    }[]
  ).map((l) => ({
    id: l.id,
    ocorridoEm: l.ocorrido_em,
    contexto: l.contexto,
    mensagem: l.mensagem,
    rota: l.rota,
    usuarioNome: l.perfis?.nome ?? null,
  }));
}
