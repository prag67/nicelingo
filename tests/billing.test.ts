import { describe, expect, it } from "vitest";
import app from "../src/index";
import {
  PASS_DAYS,
  cardPriceForPlan,
  checkoutSubscriptionDecision,
  entitlementGrantsAccess,
  isPassPlan,
  statusGrantsAccess,
  verifyStripeSignature,
} from "../src/lib/stripe";
import { billingPage } from "../src/routes/billing";
import { t } from "../src/lib/i18n";
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
    expect(html).toContain("Unit 1 (lessons 1-4) is free. Lesson 5 and up needs Premium.");
  });

  it("serves the cancel page", async () => {
    const res = await app.request("/billing/cancel");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Unit 1 is still free");
  });

  it("honors a safe ?return= and sanitizes unsafe ones", async () => {
    const ret = encodeURIComponent("/es?level=2&tab=units");
    const billing = await (await app.request(`/billing?return=${ret}`)).text();
    expect(billing).toContain('href="/es?level=2&amp;tab=units"');
    for (const evil of ["https://evil.example/x", "//evil.example/x", "javascript:alert(1)"]) {
      const html = await (await app.request(`/billing?return=${encodeURIComponent(evil)}`)).text();
      expect(html).not.toContain("evil.example");
      expect(html).not.toContain("javascript:");
    }
  });

  it("401s checkout, portal, and status without a session", async () => {
    expect((await app.request("/api/billing/checkout", { method: "POST" })).status).toBe(401);
    expect((await app.request("/api/billing/portal", { method: "POST" })).status).toBe(401);
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

describe("PromptPay passes", () => {
  it("maps pass plans to fixed days and rejects other plans", () => {
    expect(PASS_DAYS["promptpay-monthly"]).toBe(30);
    expect(PASS_DAYS["promptpay-yearly"]).toBe(365);
    expect(isPassPlan("promptpay-monthly")).toBe(true);
    expect(isPassPlan("monthly")).toBe(false);
  });

  it("grants card subscriptions on status, passes only until their period end", () => {
    const now = 1_700_000_000;
    // Card subscription: stale period end still grants (webhook renewal lag).
    expect(
      entitlementGrantsAccess(
        { status: "active", stripeSubscriptionId: "sub_1", currentPeriodEnd: now - 10 },
        now,
      ),
    ).toBe(true);
    // PromptPay pass (no subscription id): grants before expiry, not after.
    expect(
      entitlementGrantsAccess(
        { status: "active", stripeSubscriptionId: null, currentPeriodEnd: now + 10 },
        now,
      ),
    ).toBe(true);
    expect(
      entitlementGrantsAccess(
        { status: "active", stripeSubscriptionId: null, currentPeriodEnd: now - 10 },
        now,
      ),
    ).toBe(false);
    expect(
      entitlementGrantsAccess(
        { status: "canceled", stripeSubscriptionId: null, currentPeriodEnd: now + 10 },
        now,
      ),
    ).toBe(false);
  });

  it("shows PromptPay only when the billing page opts in (Thailand)", () => {
    expect(billingPage("/", { promptPay: true })).toContain("THB 99 / 30 days");
    expect(billingPage("/", { promptPay: true })).toContain('data-plan="promptpay-yearly"');
    expect(billingPage("/", { promptPay: false })).not.toContain("PromptPay");
    expect(billingPage("/")).not.toContain("PromptPay");
  });
});

describe("Thailand baht card pricing", () => {
  const env = {
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_MONTHLY_PRICE_ID: "price_usd_m",
    STRIPE_YEARLY_PRICE_ID: "price_usd_y",
    STRIPE_THB_MONTHLY_PRICE_ID: "price_thb_m",
    STRIPE_THB_YEARLY_PRICE_ID: "price_thb_y",
  };
  it("mirrors PromptPay prices for Thai card checkouts only", () => {
    expect(cardPriceForPlan(env, "monthly", "TH")).toBe("price_thb_m");
    expect(cardPriceForPlan(env, "yearly", "th")).toBe("price_thb_y");
    expect(cardPriceForPlan(env, "monthly", "GB")).toBe("price_usd_m");
    expect(cardPriceForPlan(env, "monthly", null)).toBe("price_usd_m");
    expect(cardPriceForPlan(env, "monthly", "TH")).not.toBe("price_usd_m");
  });
  it("shows baht card prices on the Thai billing page", () => {
    const th = billingPage("/", { uiLang: "th", thailand: true, promptPay: true });
    expect(th).toContain("THB 99/");
    expect(th).toContain("THB 990/");
    const us = billingPage("/", { uiLang: "th", thailand: false });
    expect(us).not.toContain("THB 99/");
  });
});

describe("localized billing page", () => {
  it("renders names, counts, and prices in Spanish", () => {
    const html = billingPage("/", { uiLang: "es" });
    expect(html).toContain(t("es").monthlyPrice);
    expect(html).toContain("$3/mes");
    expect(html).toContain("lecciones");
    expect(html).not.toContain("Level 1 only");
    expect(html).toContain('id="manage-note" hidden');
  });
  it("keeps English price labels for English UI", () => {
    expect(billingPage("/")).toContain("$3/month");
    expect(billingPage("/")).toContain("240 lessons".length ? "lessons" : "");
  });
});

describe("checkout return urls", () => {
  it("threads a safe return through success and cancel urls", () => {
    expect(checkoutReturnUrls("https://x.example", "/es?level=2")).toEqual({
      successUrl:
        "https://x.example/billing/success?session_id={CHECKOUT_SESSION_ID}&return=%2Fes%3Flevel%3D2",
      cancelUrl: "https://x.example/billing/cancel?return=%2Fes%3Flevel%3D2",
    });
    expect(safeReturnPath("https://evil.example/")).toBe("/");
    expect(safeReturnPath("//evil.example/")).toBe("/");
    expect(safeReturnPath(null)).toBe("/");
  });
});
