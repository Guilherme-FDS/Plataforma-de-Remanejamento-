import type { Config } from "tailwindcss";

/**
 * Identidade GTF. O azul #00358E é a única cor de marca usada em gtf.com.br
 * — a escala abaixo é derivada dele, e o tom 700 é o valor oficial.
 * O laranja do site pertence à marca Canção, não à GTF institucional, então
 * fica de fora.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gtf: {
          50: "#EBF2FF",
          100: "#D6E4FF",
          200: "#ADC8FF",
          300: "#7FA6F0",
          400: "#4A7FE0",
          500: "#1A56C4",
          600: "#0044AE",
          700: "#00358E", // oficial
          800: "#002B73",
          900: "#001F52",
        },
      },
      fontFamily: {
        sans: [
          "Gellix",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
