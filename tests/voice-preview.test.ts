import { describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { PREVIEW_LANGS, PREVIEW_SAMPLES, PREVIEW_VOICES } from "../src/routes/voice-preview";

function r2With(files: Record<string, string>) {
  return {
    get: vi.fn(async (key: string) => {
      const body = files[key];
      if (body === undefined) return null;
      return {
        arrayBuffer: async () => new TextEncoder().encode(body).buffer,
        writeHttpMetadata: (h: Headers) => h.set("Content-Type", "audio/mpeg"),
      };
    }),
  };
}

describe("GET /voice-preview", () => {
  it("is noindex and lists every voice with every sample", async () => {
    const res = await app.request("/voice-preview");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    const html = await res.text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    for (const v of PREVIEW_VOICES) {
      expect(html).toContain(v.name);
      for (const s of PREVIEW_SAMPLES) {
        expect(html).toContain(`/voice-preview/audio/${v.id}/${s.file}.mp3`);
      }
    }
    expect((html.match(/<audio /g) ?? []).length).toBe(
      PREVIEW_VOICES.length * PREVIEW_SAMPLES.length +
        PREVIEW_LANGS.reduce((n, l) => n + l.voices.length, 0),
    );
    for (const l of PREVIEW_LANGS) {
      expect(html).toContain(l.name);
      for (const v of l.voices) {
        expect(html).toContain(`/voice-preview/audio/${l.code}/${v.id}/sample.mp3`);
      }
    }
    expect(html).toContain('id="slow"');
    expect(html).toContain("0.85");
  });

  it("stays out of the sitemap", async () => {
    const res = await app.request("/sitemap.xml");
    expect(await res.text()).not.toContain("voice-preview");
  });
});

describe("GET /voice-preview/audio/:lang/:voice/:file", () => {
  it("serves an allowlisted language sample from R2", async () => {
    const media = r2With({ "voice-preview/de/sweetlady/sample.mp3": "MP3BYTES" });
    const res = await app.request(
      "/voice-preview/audio/de/sweetlady/sample.mp3",
      {},
      { MEDIA: media },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("MP3BYTES");
    expect(media.get).toHaveBeenCalledWith("voice-preview/de/sweetlady/sample.mp3");
  });

  it("404s unknown languages, voices, and files", async () => {
    const media = r2With({});
    for (const path of [
      "/voice-preview/audio/xx/sweetlady/sample.mp3",
      "/voice-preview/audio/de/nope/sample.mp3",
      "/voice-preview/audio/de/sweetlady/other.mp3",
      "/voice-preview/audio/de/sweetlady/sample.mp3",
    ]) {
      const res = await app.request(path, {}, { MEDIA: media });
      expect(res.status).toBe(404);
    }
    expect(media.get).toHaveBeenCalledTimes(1);
  });
});

describe("GET /voice-preview/audio/:voice/:file", () => {
  it("serves an allowlisted sample from R2", async () => {
    const media = r2With({ "voice-preview/es/selena/man-eating.mp3": "MP3BYTES" });
    const res = await app.request(
      "/voice-preview/audio/selena/man-eating.mp3",
      {},
      { MEDIA: media },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("audio/mpeg");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(await res.text()).toBe("MP3BYTES");
    expect(media.get).toHaveBeenCalledWith("voice-preview/es/selena/man-eating.mp3");
  });

  it("404s unknown voices, files, and bucket misses without leaking keys", async () => {
    const media = r2With({});
    for (const path of [
      "/voice-preview/audio/nope/man-eating.mp3",
      "/voice-preview/audio/selena/nope.mp3",
      "/voice-preview/audio/selena/../../secret.mp3",
      "/voice-preview/audio/selena/man-eating.mp3",
    ]) {
      const res = await app.request(path, {}, { MEDIA: media });
      expect(res.status).toBe(404);
    }
    expect(media.get).toHaveBeenCalledTimes(1);
  });
});
