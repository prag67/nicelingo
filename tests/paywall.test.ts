import { describe, expect, it } from "vitest";
import app from "../src/index";
import { isRegisteredUser } from "../src/lib/auth";
import { mailniceConfigured, sendEmail } from "../src/lib/email";

// NOTE: fake curriculum (Unit 1 = 001-004 free, 005-008 paid).
// Access model: Unit 1 (lessons 001-004, manifest + media + scoring) is
// open in every language; every other lesson (from Lesson 5 up) needs an
// active or trialing subscription. These run without a session/DB, so
// gated callers see 401.
describe("paid content gate", () => {
  it("leaves Unit 1 open", async () => {
    for (const n of ["001", "002", "003", "004"]) {
      expect((await app.request(`/api/lessons/xx/${n}`)).status).toBe(200);
    }
    // No ASSETS binding in tests, so open media falls through to 404 —
    // the assertion is that it is NOT gated (401/403).
    expect((await app.request("/static/lesson-002/images/wug-wugging.jpg")).status).toBe(404);
  });

  it("gates lessons beyond Unit 1 without a session", async () => {
    expect((await app.request("/api/lessons/xx/005")).status).toBe(401);
    expect((await app.request("/api/lessons/xx/006")).status).toBe(401);
    expect((await app.request("/api/lessons/yy/001")).status).toBe(200);
    expect((await app.request("/api/lessons/yy/004")).status).toBe(200);
  });

  it("gates media URLs beyond Unit 1 without a session", async () => {
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

  it("opens gated content with the local QA override", async () => {
    const open = await app.request("/api/lessons/xx/006", {}, { PAYWALL_DISABLED: "1" });
    expect(open.status).toBe(200);
  });
});

describe("registered-user check", () => {
  it("treats only non-anonymous session users as registered", () => {
    expect(isRegisteredUser(null)).toBe(false);
    expect(isRegisteredUser(undefined)).toBe(false);
    expect(isRegisteredUser({ isAnonymous: true })).toBe(false);
    expect(isRegisteredUser({ isAnonymous: null })).toBe(true);
    expect(isRegisteredUser({ isAnonymous: false })).toBe(true);
  });
});

describe("MailNice email gating", () => {
  it("is unconfigured without both MailNice settings", async () => {
    expect(mailniceConfigured(undefined)).toBe(false);
    expect(mailniceConfigured({})).toBe(false);
    expect(mailniceConfigured({ MAILNICE_API_KEY: "key" })).toBe(false);
    expect(mailniceConfigured({ EMAIL_FROM: "Nicelingo <no-reply@nicelingo.com>" })).toBe(false);
    expect(
      mailniceConfigured({
        MAILNICE_API_KEY: "key",
        EMAIL_FROM: "Nicelingo <no-reply@nicelingo.com>",
      }),
    ).toBe(true);
    // Unconfigured sends are a logged no-op, never a throw.
    await expect(
      sendEmail({}, { to: "a@b.c", subject: "s", text: "t", html: "<p>t</p>" }),
    ).resolves.toBe(false);
  });
});
