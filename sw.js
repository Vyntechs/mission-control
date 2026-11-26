// Mission Control's helper (service worker). It keeps a copy of the page and of the last Health document, so the
// page opens on the phone with no signal or with the main PC off, and then says how old its facts are. Slice 5 adds
// the alerts here: an iPhone delivers them only to a page added to its home screen.
// The network is always asked first; the copy is used only when there is no answer. The Health document itself is
// never answered from here: an old copy would read as the main PC answering now (the page keeps its own copy).
const KEEP = "mission-control-2";
const SHELL = ["./", "manifest.webmanifest", "icon-256.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(KEEP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== KEEP).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// One copy per address, the page's whatever its "?" part (a held clock in a check, a link from an alert).
function slot(req) {
  return req.mode === "navigate" ? "./" : "./" + new URL(req.url).pathname.replace(/^\/+/, "");
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.endsWith("/health.json")) return;     // straight to the main PC, or no answer
  e.respondWith(fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(KEEP).then(c => c.put(slot(req), copy));
    }
    return res;
  }).catch(() => caches.open(KEEP).then(c => c.match(slot(req))).then(hit => hit || new Response("", {status: 503}))));
});
