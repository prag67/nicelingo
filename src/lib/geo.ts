// Geo-IP default course language. A visitor's country (Cloudflare
// cf.country / CF-IPCountry) picks the default course when they have
// not chosen one yet: Thailand -> Thai, UK -> English, and so on. An
// explicit choice (cookie, account preference, top-menu switcher)
// always wins over this guess.
import { pickerLanguages } from "../lessons/languages";

export const COUNTRY_TO_LANG: Record<string, string> = {
  TH: "th",
  GB: "en", US: "en", IE: "en", AU: "en", NZ: "en", CA: "en", ZA: "en", SG: "en",
  ES: "es", MX: "es", AR: "es", CO: "es", PE: "es", VE: "es", CL: "es",
  GT: "es", EC: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es",
  NI: "es", CR: "es", PA: "es", UY: "es", CU: "es",
  DE: "de", AT: "de", CH: "de",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
  CN: "zh", TW: "zh", HK: "zh", MO: "zh",
};

/** Course code for a visitor country, or null when the country is
 *  unmapped or that course is not offered. */
export function langForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const lang = COUNTRY_TO_LANG[country.toUpperCase()];
  if (!lang) return null;
  return pickerLanguages().some((l) => l.code === lang) ? lang : null;
}

/** Visitor country from the Cloudflare request context, falling back
 *  to the CF-IPCountry header (also handy in tests). */
export function countryOfRequest(req: { headers: Headers; cf?: unknown }): string | null {
  const cf = req.cf as { country?: string } | undefined;
  // "XX" is Cloudflare's unknown-country marker (also Miniflare's
  // default in local dev): treat it as no signal and let the header
  // fallback speak, so local TH/GB contexts can be simulated.
  const country = cf?.country && cf.country !== "XX" ? cf.country : null;
  return country ?? req.headers.get("cf-ipcountry") ?? null;
}
