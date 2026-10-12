// Post-deploy verification: fetch all 32 manifests from prod and check
// every referenced audio + image URL returns 200 with a sane body.
// Usage: node scripts/verify-prod.mjs [baseUrl]
const base = process.argv[1 + 1] ?? process.argv[2] ?? "https://nicelingo.accounts-301.workers.dev";
const lessons = Array.from({ length: 96 }, (_, i) => String(i + 1).padStart(3, "0"));

let checked = 0;
let fails = 0;
for (const lang of ["en", "es"]) {
  for (const n of lessons) {
    const res = await fetch(`${base}/api/lessons/${lang}/${n}`);
    if (!res.ok) {
      console.log(`manifest ${lang}/${n}: HTTP ${res.status}`);
      fails++;
      continue;
    }
    const manifest = await res.json();
    if (manifest.phrases?.length !== 8) {
      console.log(`manifest ${lang}/${n}: ${manifest.phrases?.length} phrases`);
      fails++;
    }
    for (const p of manifest.phrases) {
      for (const url of [p.audioUrl, p.imageUrl]) {
        checked++;
        const r = await fetch(`${base}${url}`);
        const buf = r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
        if (!r.ok || !buf?.length || buf.length < 1000) {
          console.log(`${lang}/${n} ${url}: HTTP ${r.status} size=${buf?.length ?? 0}`);
          fails++;
        }
      }
    }
    console.log(`manifest ${lang}/${n}: ok`);
  }
}
console.log(`checked ${checked} media urls, ${fails} failures`);
process.exit(fails === 0 ? 0 : 1);
