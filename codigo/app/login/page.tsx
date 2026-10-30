import { destinoSeguro } from "@/lib/destino";
import TelaLogin from "@/components/TelaLogin";

export const metadata = { title: "Entrar" };

export default function Login({
  searchParams,
}: {
  searchParams: { de?: string; motivo?: string; erro?: string };
}) {
  return (
    <TelaLogin
      destino={destinoSeguro(searchParams.de)}
      motivo={searchParams.motivo}
      erro={searchParams.erro}
    />
  );
}
