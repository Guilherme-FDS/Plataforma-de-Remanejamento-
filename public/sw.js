/**
 * Service worker mínimo — o suficiente para o app ser instalável.
 *
 * DECISÃO DELIBERADA: nada de dado clínico é guardado em cache. Só o
 * "casco" do app (ícones, manifesto) fica offline. Página com nome e
 * diagnóstico de colaborador nunca é persistida no aparelho, porque celular
 * é perdido, emprestado e trocado — e cache sobrevive ao logout.
 *
 * Por isso toda navegação e toda chamada ao Supabase vão SEMPRE à rede.
 */
const CACHE = "gtf-remanejamento-v1";

const ESTATICOS = [
  "/icone-192.png",
  "/icone-512.png",
  "/icone-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase: sempre rede

  const ehEstatico =
    ESTATICOS.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/");

  if (!ehEstatico) return; // navegação e dados: sempre rede

  evento.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        }),
    ),
  );
});
