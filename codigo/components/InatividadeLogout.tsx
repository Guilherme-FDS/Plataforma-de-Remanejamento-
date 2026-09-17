"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { clienteNavegador } from "@/lib/supabase-navegador";

const LIMITE_MS = 15 * 60 * 1000; // 15 min — dado de saúde não fica aberto num celular esquecido em cima da mesa.
const CHAVE_STORAGE = "gtf-ultima-atividade";
const INTERVALO_VERIFICACAO_MS = 30_000;
const EVENTOS_DE_ATIVIDADE = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
] as const;

/**
 * Desloga sozinho depois de 15 min sem interação.
 *
 * Não é o que protege o dado — isso é a RLS. É o que evita um celular ou
 * notebook esquecido logado numa sala compartilhada continuar mostrando
 * histórico clínico horas depois.
 *
 * A marca de "última atividade" vai pro localStorage (não só memória do
 * componente): abas diferentes da mesma sessão compartilham o relógio, então
 * mexer numa aba não deixa a outra deslogar por trás.
 */
export default function InatividadeLogout() {
  const router = useRouter();
  const ultimaMarcacao = useRef(0);

  useEffect(() => {
    function marcarAtividade() {
      const agora = Date.now();
      // Throttle: não precisa gravar a cada pixel de movimento do mouse.
      if (agora - ultimaMarcacao.current < 5_000) return;
      ultimaMarcacao.current = agora;
      try {
        localStorage.setItem(CHAVE_STORAGE, String(agora));
      } catch {
        // Modo privado ou storage bloqueado: a sessão ainda expira pelo
        // refresh token do Supabase, só perde a granularidade dos 15 min.
      }
    }

    marcarAtividade();
    for (const evento of EVENTOS_DE_ATIVIDADE) {
      window.addEventListener(evento, marcarAtividade, { passive: true });
    }

    const verificacao = setInterval(async () => {
      let ultima = ultimaMarcacao.current;
      try {
        ultima = Number(localStorage.getItem(CHAVE_STORAGE)) || ultima;
      } catch {
        // Sem storage, cai para o relógio só desta aba.
      }

      if (Date.now() - ultima >= LIMITE_MS) {
        clearInterval(verificacao);
        await clienteNavegador().auth.signOut();
        router.replace("/login?motivo=inatividade");
      }
    }, INTERVALO_VERIFICACAO_MS);

    return () => {
      for (const evento of EVENTOS_DE_ATIVIDADE) {
        window.removeEventListener(evento, marcarAtividade);
      }
      clearInterval(verificacao);
    };
  }, [router]);

  return null;
}
