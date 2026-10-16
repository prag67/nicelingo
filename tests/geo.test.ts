import { describe, expect, it } from "vitest";
import app from "../src/index";
import { COUNTRY_TO_LANG, langForCountry } from "../src/lib/geo";

// NOTE: fake curriculum offers en/xx/yy only, so geo defaults resolve
// only where the mapped course exists (en here). The full country map
// is asserted directly; th/es/de/fr/zh activate in the merged tree.
describe("country to course map", () => {
  it("maps Thailand, UK, and the other course countries", () => {
    expect(COUNTRY_TO_LANG.TH).toBe("th");
    expect(COUNTRY_TO_LANG.GB).toBe("en");
    expect(COUNTRY_TO_LANG.US).toBe("en");
    expect(COUNTRY_TO_LANG.ES).toBe("es");
    expect(COUNTRY_TO_LANG.MX).toBe("es");
    expect(COUNTRY_TO_LANG.DE).toBe("de");
    expect(COUNTRY_TO_LANG.FR).toBe("fr");
    expect(COUNTRY_TO_LANG.CN).toBe("zh");
    expect(COUNTRY_TO_LANG.TW).toBe("zh");
  });

  it("resolves only offered courses, case-insensitively", () => {
    expect(langForCountry("GB")).toBe("en");
    expect(langForCountry("gb")).toBe("en");
    expect(langForCountry("TH")).toBeNull(); // no Thai course in fake tree
    expect(langForCountry("JP")).toBeNull();
    expect(langForCountry(null)).toBeNull();
    expect(langForCountry(undefined)).toBeNull();
  });
});

describe("no redirects on /", () => {
  it("always shows the picker, whatever the country guess", async () => {
    // The hero localizes (TH renders Thai), so assert the parrot mark.
    for (const country of ["GB", "TH", "FI"]) {
      const res = await app.request("/", {
        headers: { "cf-ipcountry": country },
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('data-logo="parrot"');
    }
  });

  it("ignores a remembered language on /", async () => {
    const res = await app.request("/", {
      headers: { "cf-ipcountry": "GB", Cookie: "nl_lang=xx" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("What do you want to learn?");
  });

  it("shows the picker when no country is known", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
  });
});
