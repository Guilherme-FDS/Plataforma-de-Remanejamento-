/**
 * Estado do segundo fator do usuário logado.
 *
 * Existe para a interface saber o que pedir. Quem de fato barra o acesso é a
 * RLS (`mfa_ok()`, migration 0012) — se esta função mentir, o banco continua
 * devolvendo vazio. A tela só serve para o usuário entender por quê.
 */
import { cache } from "react";
import { clienteServidor } from "./supabase-servidor";

export interface EstadoMfa {
  /** Já cadastrou e verificou um autenticador alguma vez. */
  temFator: boolean;
  /** Esta sessão passou pelo segundo fator (AAL2). */
  sessaoVerificada: boolean;
  /** Admin ligou a exigência para toda a plataforma. */
  obrigatorio: boolean;
  /**
   * Tem fator cadastrado, mas entrou só com senha. Acontece com sessão
   * antiga, aberta antes do cadastro do fator. Precisa digitar o código.
   */
  precisaConfirmar: boolean;
  /** Não tem fator e a plataforma exige. Precisa cadastrar. */
  precisaCadastrar: boolean;
  /** Qualquer um dos dois: a pessoa não enxerga dado clínico assim. */
  bloqueado: boolean;
}

const SEM_SESSAO: EstadoMfa = {
  temFator: false,
  sessaoVerificada: false,
  obrigatorio: false,
  precisaConfirmar: false,
  precisaCadastrar: false,
  bloqueado: false,
};

/**
 * Nunca lança: é chamada pelo layout raiz, que envolve todas as páginas —
 * inclusive o login. Mesmo motivo de `perfilAtual()` em lib/dados.ts.
 */
export const estadoMfa = cache(async (): Promise<EstadoMfa> => {
  try {
    const supabase = clienteServidor();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return SEM_SESSAO;

    // Decodifica o AAL do próprio JWT da sessão — não vai à rede.
    //   currentLevel: como esta sessão foi autenticada
    //   nextLevel:    o nível que ela PODERIA alcançar; vira aal2 assim que
    //                 existe um fator verificado na conta
    const { data: nivel } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const temFator = nivel?.nextLevel === "aal2";
    const sessaoVerificada = nivel?.currentLevel === "aal2";

    const { data: config } = await supabase
      .from("configuracoes")
      .select("mfa_obrigatorio")
      .maybeSingle();
    const obrigatorio =
      (config as { mfa_obrigatorio?: boolean } | null)?.mfa_obrigatorio ?? false;

    const precisaConfirmar = temFator && !sessaoVerificada;
    const precisaCadastrar = !temFator && obrigatorio;

    return {
      temFator,
      sessaoVerificada,
      obrigatorio,
      precisaConfirmar,
      precisaCadastrar,
      bloqueado: precisaConfirmar || precisaCadastrar,
    };
  } catch (erro) {
    // Mesmo motivo do catch em perfilAtual() (lib/dados.ts): sem log, uma
    // falha de configuração vira "sem sessão" silenciosamente.
    console.error("estadoMfa() falhou:", erro);
    return SEM_SESSAO;
  }
});
