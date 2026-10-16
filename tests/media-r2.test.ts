import { describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { r2KeyForMedia } from "../src/lib/media-keys";

describe("r2KeyForMedia", () => {
  it("maps default-voice audio to voice-first keys", () => {
    expect(r2KeyForMedia("lesson-001/audio/es/man-drinking.mp3")).toBe(
      "voice/es/001/man-drinking.mp3",
    );
    // English clips carry no language segment.
    expect(r2KeyForMedia("lesson-001/audio/man-drinking.mp3")).toBe(
      "voice/en/001/man-drinking.mp3",
    );
  });

  it("nests alt voices one level deeper", () => {
    expect(r2KeyForMedia("lesson-001/audio/es/alvaro/man-drinking.mp3")).toBe(
      "voice/es/001/alvaro/man-drinking.mp3",
    );
  });

  it("maps images and thumbnails", () => {
    expect(r2KeyForMedia("lesson-001/images/man-drinking.jpg")).toBe(
      "images/001/man-drinking.jpg",
    );
    expect(r2KeyForMedia("lesson-006/images/thumb.jpg")).toBe(
      "images/006/thumb.jpg",
    );
  });

  it("returns null for anything outside lesson media", () => {
    expect(r2KeyForMedia("app/site.css")).toBeNull();
    expect(r2KeyForMedia("lesson-001/audio/es/no-extension")).toBeNull();
    expect(r2KeyForMedia("lesson-001/audio/es/nested/deep.txt")).toBeNull();
  });
});

function r2With(files: Record<string, string>) {
  return {
    get: vi.fn(async (key: string) => {
      const body = files[key];
      if (body === undefined) return null;
      return {
        arrayBuffer: async () => new TextEncoder().encode(body).buffer,
        writeHttpMetadata: (h: Headers) => {
          h.set("Content-Type", key.endsWith(".mp3") ? "audio/mpeg" : "image/jpeg");
        },
        etag: `"${key.length}"`,
      };
    }),
  };
}

describe("GET /static from R2", () => {
  it("serves open media from the bucket with cache headers", async () => {
    const media = r2With({ "voice/xx/002/combo.mp3": "MP3BYTES" });
    const res = await app.request(
      "/static/lesson-002/audio/xx/combo.mp3",
      {},
      { MEDIA: media },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("audio/mpeg");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(await res.text()).toBe("MP3BYTES");
    expect(media.get).toHaveBeenCalledWith("voice/xx/002/combo.mp3");
  });

  it("gates paid media before touching the bucket", async () => {
    const media = r2With({ "voice/xx/006/combo.mp3": "MP3BYTES" });
    const res = await app.request(
      "/static/lesson-006/audio/xx/combo.mp3",
      {},
      { MEDIA: media },
    );
    expect(res.status).toBe(401);
    expect(media.get).not.toHaveBeenCalled();
  });

  it("falls through to 404 on a bucket miss without assets", async () => {
    const res = await app.request(
      "/static/lesson-002/audio/xx/missing.mp3",
      {},
      { MEDIA: r2With({}) },
    );
    expect(res.status).toBe(404);
  });
});
