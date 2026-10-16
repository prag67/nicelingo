// R2 key scheme for lesson media (bucket nicelingo-media):
//   audio: voice/{lang}/{lesson}/{file}.mp3, alt voices nested one
//   deeper: voice/{lang}/{lesson}/{voice}/{file}.mp3
//   images: images/{lesson}/{file}.jpg (thumbs included)
// Legacy URL paths (/static/lesson-001/audio/es/combo.mp3) stay stable;
// this pure mapping is the only place that knows both shapes.
export function r2KeyForMedia(rest: string): string | null {
  let m = /^lesson-(\d{3})\/audio\/([a-z]{2})\/([^/]+)\/([^/]+\.mp3)$/.exec(rest);
  if (m) return `voice/${m[2]}/${m[1]}/${m[3]}/${m[4]}`;
  m = /^lesson-(\d{3})\/audio\/([a-z]{2})\/([^/]+\.mp3)$/.exec(rest);
  if (m) return `voice/${m[2]}/${m[1]}/${m[3]}`;
  m = /^lesson-(\d{3})\/audio\/([^/]+\.mp3)$/.exec(rest);
  if (m) return `voice/en/${m[1]}/${m[2]}`;
  m = /^lesson-(\d{3})\/images\/(.+)$/.exec(rest);
  if (m) return `images/${m[1]}/${m[2]}`;
  return null;
}
