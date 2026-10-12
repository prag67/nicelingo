import { describe, expect, it } from "vitest";
import app from "../src/index";

// NOTE: fake curriculum (Unit 1 = 001-004 free, 005-008 paid).
// Paywall: Unit 1 (lessons 001-004, manifest + media) is open in every
// language; every other lesson needs a session + subscription, on the
// manifest, the media URLs, and scoring. These run without credentials,
// so authed callers see 402s.
describe("paid content gate", () => {
  it("leaves Unit 1 open", async () => {
    for (const n of ["001", "002", "003", "004"]) {
      expect((await app.request(`/api/lessons/xx/${n}`)).status).toBe(200);
    }
    // No ASSETS binding in tests, so open media falls through to 404 —
    // the assertion is that it is NOT gated (401/402).
    expect((await app.request("/static/lesson-002/images/wug-wugging.jpg")).status).toBe(404);
  });

  it("gates paid manifests without a session", async () => {
    expect((await app.request("/api/lessons/xx/005")).status).toBe(401);
    expect((await app.request("/api/lessons/xx/006")).status).toBe(401);
    expect((await app.request("/api/lessons/yy/001")).status).toBe(200);
    expect((await app.request("/api/lessons/yy/004")).status).toBe(200);
  });

  it("gates paid media URLs without a session", async () => {
    expect((await app.request("/static/lesson-006/audio/xx/wug-zorping.mp3")).status).toBe(401);
    expect((await app.request("/static/lesson-005/images/wug-wugging.jpg")).status).toBe(401);
  });

  it("leaves teaser thumbnails public", async () => {
    // 404 in tests (no ASSETS binding) proves the gate was skipped.
    expect((await app.request("/static/lesson-006/images/thumb.jpg")).status).toBe(404);
  });

  it("still 404s unknown lessons and media", async () => {
    expect((await app.request("/api/lessons/xx/999")).status).toBe(404);
  });

  it("opens paid content with the local QA override", async () => {
    const open = await app.request("/api/lessons/xx/006", {}, { PAYWALL_DISABLED: "1" });
    expect(open.status).toBe(200);
  });
});
