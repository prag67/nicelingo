import { describe, expect, it } from "vitest";
import app from "../src/index";
import {
  checkoutSubscriptionDecision,
  statusGrantsAccess,
  verifyStripeSignature,
} from "../src/lib/stripe";
import { checkoutReturnUrls, safeReturnPath } from "../src/routes/billing";

async function sign(secret: string, body: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = [
    ...new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${timestamp}.${body}`),
      ),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${digest}`;
}

describe("stripe signature verification", () => {
  const body = '{"id":"evt_test"}';
  const secret = "whsec_test";

  it("accepts a fresh valid signature", async () => {
    const sig = await sign(secret, body, Math.floor(Date.now() / 1000));
    await expect(verifyStripeSignature(body, sig, secret)).resolves.toBe(true);
  });

  it("rejects wrong secrets, stale timestamps, and missing headers", async () => {
    const now = Math.floor(Date.now() / 1000);
    const valid = await sign(secret, body, now);
    await expect(verifyStripeSignature(body, valid, "whsec_other")).resolves.toBe(false);
    const stale = await sign(secret, body, now - 301);
    await expect(verifyStripeSignature(body, stale, secret)).resolves.toBe(false);
    await expect(verifyStripeSignature(body, undefined, secret)).resolves.toBe(false);
    await expect(verifyStripeSignature(body, valid, undefined)).resolves.toBe(false);
  });
});

describe("checkout subscription ordering", () => {
  it("adopts the first subscription and ignores older arrivals", () => {
    expect(
      checkoutSubscriptionDecision({ incomingId: "sub_new" }),
    ).toBe("adopt");
    expect(
      checkoutSubscriptionDecision({
        currentId: "sub_a",
        currentCreated: 100,
        incomingId: "sub_a",
        incomingCreated: 100,
      }),
    ).toBe("same");
    expect(
      checkoutSubscriptionDecision({
        currentId: "sub_new",
        currentCreated: 200,
        incomingId: "sub_old",
        incomingCreated: 100,
      }),
    ).toBe("ignore");
    expect(
      checkoutSubscriptionDecision({
        currentId: "sub_old",
        currentCreated: 100,
        incomingId: "sub_new",
        incomingCreated: 200,
      }),
    ).toBe("adopt");
  });

  it("grants access only to active and trialing statuses", () => {
    expect(statusGrantsAccess("active")).toBe(true);
    expect(statusGrantsAccess("trialing")).toBe(true);
    for (const status of ["past_due", "canceled", "none", null, undefined]) {
      expect(statusGrantsAccess(status)).toBe(false);
    }
  });
});

describe("billing routes", () => {
  it("serves the plans page with both prices", async () => {
    const res = await app.request("/billing");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("$3/month");
    expect(html).toContain("$29/year");
    expect(html).toContain('data-plan="monthly"');
    expect(html).toContain('data-plan="yearly"');
  });

  it("derives the unlocked-languages list from the registry", async () => {
    const html = await (await app.request("/billing")).text();
    expect(html).toContain("every lesson in every language");
    expect(html).toContain("English, Xxian, and Yyan (Level 1 only)");
    expect(html).not.toContain("in English and Spanish");
  });

  it("wires the parrot favicon set and brand theme-color", async () => {
    const html = await (await app.request("/billing")).text();
    expect(html).toContain('href="/logo/favicon.svg"');
    expect(html).toContain('href="/logo/favicon-32.png"');
    expect(html).toContain('href="/logo/favicon-16.png"');
    expect(html).toContain('href="/logo/apple-touch-icon.png"');
    expect(html).toContain('name="theme-color" content="#1a5feb"');
  });

  it("names Unit 1 as the free tier", async () => {
    const html = await (await app.request("/billing")).text();
    expect(html).toContain("Unit 1 (lessons 1-4) is free forever");
    const cancel = await (await app.request("/billing/cancel")).text();
    expect(cancel).toContain("Unit 1 is still free");
  });

  it("honors a safe ?return= on billing, success, and cancel pages", async () => {
    // Two query params so the & escaping path is actually exercised.
    const ret = encodeURIComponent("/es?level=2&tab=units");
    const esc = (s: string) => s.replace(/&/g, "&amp;");
    const billing = await (await app.request(`/billing?return=${ret}`)).text();
    expect(billing).toContain(esc('href="/es?level=2&tab=units"'));
    expect(billing).toContain(esc('data-return="/es?level=2&tab=units"'));
    const success = await (
      await app.request(`/billing/success?session_id=x&return=${ret}`)
    ).text();
    expect(success).toContain(esc('href="/es?level=2&tab=units"'));
    const cancel = await (
      await app.request(`/billing/cancel?return=${ret}`)
    ).text();
    expect(cancel).toContain(esc('href="/es?level=2&tab=units"'));
  });

  it("falls back to / for missing or unsafe ?return=", async () => {
    expect(await (await app.request("/billing")).text()).toContain(
      'href="/"',
    );
    for (const evil of [
      "https://evil.example/x",
      "//evil.example/x",
      "javascript:alert(1)",
      "/\\evil.example",
    ]) {
      const html = await (
        await app.request(`/billing?return=${encodeURIComponent(evil)}`)
      ).text();
      expect(html).not.toContain("evil.example");
      expect(html).not.toContain("javascript:");
      expect(html).toContain('href="/"');
    }
  });

  it("serves the cancel page", async () => {
    expect((await app.request("/billing/cancel")).status).toBe(200);
  });

  it("401s checkout, portal, and status without a session", async () => {
    expect(
      (await app.request("/api/billing/checkout", { method: "POST" })).status,
    ).toBe(401);
    expect(
      (await app.request("/api/billing/portal", { method: "POST" })).status,
    ).toBe(401);
    expect((await app.request("/api/billing/status")).status).toBe(401);
  });

  it("401s the webhook on a bad signature", async () => {
    const res = await app.request("/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      body: '{"id":"evt_test"}',
    });
    expect(res.status).toBe(401);
  });
});

describe("checkout return urls", () => {
  it("threads a safe return through success and cancel urls", () => {
    expect(checkoutReturnUrls("https://x.example", "/es?level=2")).toEqual({
      successUrl:
        "https://x.example/billing/success?session_id={CHECKOUT_SESSION_ID}&return=%2Fes%3Flevel%3D2",
      cancelUrl: "https://x.example/billing/cancel?return=%2Fes%3Flevel%3D2",
    });
  });

  it("sanitizes unsafe returns to /", () => {
    expect(safeReturnPath("https://evil.example/x")).toBe("/");
    expect(safeReturnPath("//evil.example/x")).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
    expect(
      checkoutReturnUrls("https://x.example", "javascript:alert(1)")
        .successUrl,
    ).toBe(
      "https://x.example/billing/success?session_id={CHECKOUT_SESSION_ID}&return=%2F",
    );
  });
});

describe("lesson gating", () => {
  it("keeps Lesson 1 free in both languages", async () => {
    expect((await app.request("/api/lessons/01")).status).toBe(200);
    expect((await app.request("/api/lessons/xx/001")).status).toBe(200);
    expect((await app.request("/api/lessons/en/001")).status).toBe(200);
  });

  it("requires a session for paid lessons", async () => {
    expect((await app.request("/api/lessons/en/005")).status).toBe(401);
    expect((await app.request("/api/lessons/xx/006")).status).toBe(401);
  });

  it("still 404s unknown lessons before auth", async () => {
    expect((await app.request("/api/lessons/en/999")).status).toBe(404);
  });
});

describe("billing poolside skin", () => {
  it("serves Poolside tokens with no teal residue", async () => {
    const html = await (await app.request("/billing")).text();
    expect(html).toContain("#1a5feb");
    expect(html.toLowerCase()).not.toContain("0e7c6b");
  });
});
