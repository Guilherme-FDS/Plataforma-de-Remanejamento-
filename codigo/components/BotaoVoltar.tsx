"use client";

import { useRouter } from "next/navigation";

/**
 * Volta para a página de onde o usuário veio (Pendências, Indicadores…).
 * Sem histórico interno (link aberto direto/aba nova), cai no `padrao`.
 */
export default function BotaoVoltar({
  padrao,
  rotulo = "← Voltar",
}: {
  padrao: string;
  rotulo?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        const veioDoSistema =
          document.referrer &&
          new URL(document.referrer).origin === window.location.origin;
        if (veioDoSistema && window.history.length > 1) router.back();
        else router.push(padrao);
      }}
      className="text-sm font-medium text-slate-500 hover:text-slate-900"
    >
      {rotulo}
    </button>
  );
}
