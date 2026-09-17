/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não é segurança de verdade, mas não custa nada tirar: sem isso, toda
  // resposta manda "X-Powered-By: Next.js", um dado de graça pra quem
  // estiver reconhecendo o alvo antes de atacar.
  poweredByHeader: false,
};

module.exports = nextConfig;
