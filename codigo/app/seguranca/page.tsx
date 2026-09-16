import { redirect } from "next/navigation";
import { resumoMfa } from "@/app/actions/seguranca";
import GestaoMfa from "@/components/GestaoMfa";
import { Cabecalho } from "@/components/ui";
import { perfilAtual } from "@/lib/dados";
import { estadoMfa } from "@/lib/mfa";
import PainelMfaEquipe from "./PainelMfaEquipe";

export const metadata = { title: "Segurança" };

/**
 * Acessível a QUALQUER papel, inclusive visualizador — é a única tela que
 * precisa continuar aberta quando o MFA obrigatório está bloqueando o resto.
 */
export default async function PaginaSeguranca() {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/login");

  const [mfa, resumo] = await Promise.all([estadoMfa(), resumoMfa()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Cabecalho
        titulo="Segurança"
        descricao="Como esta conta é protegida. Estas configurações valem só para você, exceto onde estiver indicado."
      />

      <div className="mt-6 space-y-6">
        <GestaoMfa obrigatorio={mfa.obrigatorio} />

        {resumo && (
          <PainelMfaEquipe obrigatorio={mfa.obrigatorio} resumo={resumo} />
        )}
      </div>
    </main>
  );
}
