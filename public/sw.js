// Nicelingo offline cache. Precache the lesson shells + all lesson media;
// serve static assets cache-first, the manifest network-first with fallback.
const CACHE = "nicelingo-v37";

// Fallback when /api/curriculum is unreachable during install; the live
// endpoint is the source of truth so future levels precache automatically.
const FALLBACK_LESSONS = Array.from({ length: 96 }, (_, i) =>
  String(i + 1).padStart(3, "0"),
);

async function lessonNumbers() {
  try {
    const res = await fetch("/api/curriculum");
    const { levels } = await res.json();
    return levels.flatMap((l) =>
      l.units.flatMap((u) => u.lessons.map((lesson) => lesson.n)),
    );
  } catch {
    return FALLBACK_LESSONS;
  }
}

async function precache() {
  const cache = await caches.open(CACHE);
  const numbers = await lessonNumbers();
  // Course shells: keep in sync with pickerLanguages() in
  // src/lessons/languages.ts (hidden languages stay out).
  const core = [
    "/",
    "/developers",
    "/en",
    "/es",
    "/de",
    "/fr",
    "/zh",
    ...numbers.flatMap((n) => [
      `/lesson/en/${n}`,
      `/lesson/es/${n}`,
      `/lesson/de/${n}`,
      `/lesson/fr/${n}`,
      `/lesson/th/${n}`,
      `/lesson/zh/${n}`,
    ]),
    "/app/lesson.css",
    "/app/player.js",
    "/app/lesson-flow.js",
    "/app/sync-queue.js",
    "/app/site.css",
    "/logo/parrot-mark.svg",
    "/logo/favicon.svg",
    "/logo/favicon-32.png",
    "/logo/favicon-16.png",
    "/logo/apple-touch-icon.png",
    "/logo/app-icon-192.png",
    "/logo/app-icon-512.png",
    "/manifest.json",
    "/fonts/bricolagegrotesque-latin.woff2",
    "/fonts/bricolagegrotesque-latin-ext.woff2",
    "/fonts/figtree-latin.woff2",
    "/fonts/figtree-latin-ext.woff2",
    ...numbers.map((n) => `/static/lesson-${n}/images/thumb.jpg`),
    ...numbers.flatMap((n) => [
      `/api/lessons/en/${n}`,
      `/api/lessons/es/${n}`,
      `/api/lessons/de/${n}`,
      `/api/lessons/fr/${n}`,
      `/api/lessons/th/${n}`,
      `/api/lessons/zh/${n}`,
    ]),
  ];
  await Promise.allSettled(core.map((url) => cache.add(url)));
  for (const url of numbers.flatMap((n) => [
    `/api/lessons/en/${n}`,
    `/api/lessons/es/${n}`,
    `/api/lessons/de/${n}`,
    `/api/lessons/fr/${n}`,
    `/api/lessons/th/${n}`,
    `/api/lessons/zh/${n}`,
  ])) {
    try {
      const res = await fetch(url);
      const manifest = await res.json();
      const media = manifest.phrases.flatMap((p) => [p.audioUrl, p.imageUrl]);
      await Promise.allSettled(media.map((u) => cache.add(u)));
    } catch {
      // Offline during install: shell still cached, media fills in later.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  // Fonts and brand files are immutable (a new file ships with a new
  // SW version).
  if (url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/logo/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  // Media is immutable in practice but re-takes reuse URLs: serve cached
  // instantly, refresh in the background.
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  if (
    url.pathname.startsWith("/app/") ||
    url.pathname.startsWith("/api/lessons/") ||
    url.pathname === "/api/curriculum"
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  // Lesson shells: navigations may carry query params (?demo=, UTM) that
  // must not miss the cache — fall back to the bare shell URL.
  if (url.pathname.startsWith("/lesson/")) {
    event.respondWith(networkFirst(event.request, `${url.origin}${url.pathname}`));
    return;
  }
  // Picker, course shells (?level= deep-links), developers: same
  // query-stripping treatment as lesson shells.
  if (
    url.pathname === "/" ||
    url.pathname === "/developers" ||
    /^\/(en|es|de|fr|zh)$/.test(url.pathname)
  ) {
    event.respondWith(networkFirst(event.request, `${url.origin}${url.pathname}`));
    return;
  }
  // auth / score / progress: network-only, let the page handle failure.
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) return cached;
  const res = await refresh;
  if (res) return res;
  throw new Error("offline and not cached");
}

async function networkFirst(request, fallbackKey) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(CACHE);
    const cached =
      (await cache.match(request)) ??
      (fallbackKey ? await cache.match(fallbackKey) : null);
    if (cached) return cached;
    throw new Error("offline and not cached");
  }
}
