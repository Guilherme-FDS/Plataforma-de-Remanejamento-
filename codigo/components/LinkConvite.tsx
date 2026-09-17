"use client";

import { useState } from "react";

/**
 * Mostra o link de definição de senha para o admin repassar por onde
 * quiser — WhatsApp, e-mail corporativo, pessoalmente.
 *
 * Existe como SEGUNDA VIA do convite por e-mail, não no lugar dele: o
 * e-mail continua saindo normalmente. Serve para quando ele demora, cai no
 * spam, ou esbarra no limite de envio do serviço padrão do Supabase (que é
 * de poucos e-mails por hora).
 */
export default function LinkConvite({
  link,
  emailEnviado,
}: {
  link: string;
  emailEnviado: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Navegador sem permissão de área de transferência (acontece em
      // conexão sem HTTPS): o link está visível na tela para seleção
      // manual, então não há o que fazer além de não quebrar.
    }
  }

  return (
    <div
      className={`rounded-lg p-4 ring-1 ring-inset ${
        emailEnviado
          ? "bg-emerald-50 ring-emerald-600/20"
          : "bg-amber-50 ring-amber-600/30"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          emailEnviado ? "text-emerald-900" : "text-amber-900"
        }`}
      >
        {emailEnviado
          ? "Usuário criado e convite enviado por e-mail."
          : "Usuário criado, mas o e-mail não saiu (limite de envio do Supabase)."}
      </p>

      <p
        className={`mt-1 text-xs leading-relaxed ${
          emailEnviado ? "text-emerald-800" : "text-amber-800"
        }`}
      >
        {emailEnviado
          ? "Se preferir, ou se o e-mail não chegar, mande este link direto para a pessoa — ele leva à mesma tela de criar senha."
          : "Mande este link para a pessoa por WhatsApp ou e-mail corporativo — é o único caminho até o e-mail voltar a funcionar."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 font-mono text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={copiar}
          className="h-9 shrink-0 rounded-md bg-gtf-700 px-4 text-sm font-medium text-white transition hover:bg-gtf-800"
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        O link expira e só pode ser usado uma vez. Trate como senha: quem
        tiver ele define a senha dessa conta.
      </p>
    </div>
  );
}
