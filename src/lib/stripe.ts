// Stripe billing via raw REST calls (same pattern as blognice: no SDK,
// Workers-native fetch + WebCrypto). Checkout creates the subscription,
// Customer Portal hosts invoices/plan changes/cancellation, and the webhook
// mirrors entitlement into D1. Lesson 01 stays free; everything else gates
// on an active subscription.
export type StripeEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_MONTHLY_PRICE_ID?: string;
  STRIPE_YEARLY_PRICE_ID?: string;
  STRIPE_THB_MONTHLY_PRICE_ID?: string;
  STRIPE_THB_YEARLY_PRICE_ID?: string;
  STRIPE_PROMPTPAY_MONTHLY_PRICE_ID?: string;
  STRIPE_PROMPTPAY_YEARLY_PRICE_ID?: string;
  STRIPE_PORTAL_CONFIGURATION_ID?: string;
};

export type BillingPlan = "monthly" | "yearly";

/** One-time PromptPay passes (Thailand): no auto-renewal, access runs
 *  for a fixed number of days from purchase (stacking onto any unexpired
 *  pass). PromptPay itself is one-time-only in Stripe, hence passes. */
export type PassPlan = "promptpay-monthly" | "promptpay-yearly";

export const PASS_DAYS: Record<PassPlan, number> = {
  "promptpay-monthly": 30,
  "promptpay-yearly": 365,
};

export function isPassPlan(plan: string): plan is PassPlan {
  return plan === "promptpay-monthly" || plan === "promptpay-yearly";
}

export function passPriceForPlan(env: StripeEnv, plan: PassPlan): string | null {
  return plan === "promptpay-monthly"
    ? (env.STRIPE_PROMPTPAY_MONTHLY_PRICE_ID ?? null)
    : (env.STRIPE_PROMPTPAY_YEARLY_PRICE_ID ?? null);
}

export function stripeConfigured(env: StripeEnv | undefined): boolean {
  return Boolean(
    env?.STRIPE_SECRET_KEY &&
      (env.STRIPE_MONTHLY_PRICE_ID || env.STRIPE_YEARLY_PRICE_ID),
  );
}

/** Card price for a plan: Thai visitors (country TH) get the baht
 *  prices mirroring PromptPay (THB 99/month, THB 990/year); everyone
 *  else gets the USD prices. Falls back to USD when THB is unset. */
export function cardPriceForPlan(
  env: StripeEnv,
  plan: BillingPlan,
  country: string | null | undefined,
): string | null {
  if (country?.toUpperCase() === "TH") {
    const thb = plan === "monthly" ? env.STRIPE_THB_MONTHLY_PRICE_ID : env.STRIPE_THB_YEARLY_PRICE_ID;
    if (thb) return thb;
  }
  return priceForPlan(env, plan);
}

export function priceForPlan(env: StripeEnv, plan: BillingPlan): string | null {
  return plan === "monthly"
    ? (env.STRIPE_MONTHLY_PRICE_ID ?? null)
    : (env.STRIPE_YEARLY_PRICE_ID ?? null);
}

async function stripeRequest<T>(
  env: StripeEnv,
  path: string,
  params: URLSearchParams,
  idempotencyKey?: string,
): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  const headers: Record<string, string> = {
    Authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers,
    body: params,
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & T;
  if (!response.ok)
    throw new Error(body.error?.message || `Stripe returned HTTP ${response.status}.`);
  return body;
}

async function stripeGet<T>(env: StripeEnv, path: string): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}` },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & T;
  if (!response.ok)
    throw new Error(body.error?.message || `Stripe returned HTTP ${response.status}.`);
  return body;
}

export type StripeSubscription = {
  id: string;
  customer?: string;
  created?: number;
  status?: string;
  current_period_end?: number;
  trial_end?: number;
  cancel_at_period_end?: boolean;
  items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number }> };
};

export type CheckoutSubscriptionDecision = "adopt" | "same" | "ignore";

/**
 * Decide whether a completed Checkout session may become the user's current
 * subscription. Stripe event delivery order is not authoritative: a delayed
 * Checkout event for an older subscription can arrive after a newer purchase.
 * The subscriptions' own creation timestamps provide the stable ordering.
 */
export function checkoutSubscriptionDecision(input: {
  currentId?: string | null;
  currentCreated?: number | null;
  incomingId: string;
  incomingCreated?: number | null;
}): CheckoutSubscriptionDecision {
  if (!input.currentId) return "adopt";
  if (input.currentId === input.incomingId) return "same";
  if (!input.currentCreated || !input.incomingCreated) return "ignore";
  return input.incomingCreated > input.currentCreated ? "adopt" : "ignore";
}

export function subscriptionEventMatchesCurrent(
  currentId: string | null | undefined,
  incomingId: string,
): boolean {
  return !currentId || currentId === incomingId;
}

// Subscription statuses that unlock paid lessons.
export function statusGrantsAccess(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Whether a stored entitlement row currently unlocks paid lessons.
 *  Card subscriptions (a Stripe subscription id is present) grant on
 *  status alone — their period end renews and a delayed webhook must not
 *  lock a paying subscriber out. PromptPay passes have no subscription
 *  id, so they grant only until their fixed period end. */
export function entitlementGrantsAccess(
  row: {
    status: string | null | undefined;
    stripeSubscriptionId: string | null | undefined;
    currentPeriodEnd: number | null | undefined;
  },
  nowSeconds: number,
): boolean {
  if (!statusGrantsAccess(row.status)) return false;
  if (row.stripeSubscriptionId) return true;
  return (row.currentPeriodEnd ?? 0) > nowSeconds;
}

export function retrieveSubscription(env: StripeEnv, subscriptionId: string) {
  return stripeGet<StripeSubscription>(
    env,
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

export type CheckoutSession = {
  id: string;
  status?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  client_reference_id?: string;
  customer?: string;
  subscription?: string | StripeSubscription;
  metadata?: Record<string, string>;
};

// Retrieve a Checkout Session with its subscription expanded, so the billing
// success page can verify completion server-side instead of trusting the
// redirect alone.
export function retrieveCheckoutSession(env: StripeEnv, sessionId: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId))
    throw new Error("Invalid checkout session.");
  return stripeGet<CheckoutSession>(
    env,
    `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
  );
}

export function createCheckoutSession(
  env: StripeEnv,
  input: {
    userId: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
    priceId: string;
    customerId?: string | null;
  },
) {
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", input.priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", input.userId);
  params.set("customer_email", input.email);
  if (input.customerId) {
    params.delete("customer_email");
    params.set("customer", input.customerId);
  }
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("metadata[user_id]", input.userId);
  params.set("subscription_data[metadata][user_id]", input.userId);
  return stripeRequest<{ id: string; url: string }>(
    env,
    "checkout/sessions",
    params,
    `nicelingo-checkout-${input.userId}-${input.priceId}`,
  );
}

/** One-time PromptPay checkout for a fixed-day pass. Payment mode with
 *  the promptpay payment method only; the webhook grants the pass after
 *  verifying payment, keyed by the metadata stamped here. */
export function createPassCheckoutSession(
  env: StripeEnv,
  input: {
    userId: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
    priceId: string;
    passDays: number;
    customerId?: string | null;
  },
) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("payment_method_types[0]", "promptpay");
  params.set("line_items[0][price]", input.priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", input.userId);
  if (input.customerId) {
    params.set("customer", input.customerId);
  } else {
    params.set("customer_email", input.email);
    params.set("customer_creation", "always");
  }
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("metadata[user_id]", input.userId);
  params.set("metadata[kind]", "promptpay_pass");
  params.set("metadata[pass_days]", String(input.passDays));
  return stripeRequest<{ id: string; url: string }>(
    env,
    "checkout/sessions",
    params,
    `nicelingo-pass-${input.userId}-${input.priceId}`,
  );
}

export function createPortalSession(
  env: StripeEnv,
  customerId: string,
  returnUrl: string,
) {
  const params = new URLSearchParams({
    customer: customerId,
    return_url: returnUrl,
  });
  if (env.STRIPE_PORTAL_CONFIGURATION_ID)
    params.set("configuration", env.STRIPE_PORTAL_CONFIGURATION_ID);
  return stripeRequest<{ id: string; url: string }>(
    env,
    "billing_portal/sessions",
    params,
  );
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeHexEqual(actual: string, expected: string): boolean {
  // Stripe sends a SHA-256 HMAC as 64 lowercase hexadecimal characters. Keep
  // the comparison length fixed so a valid-looking signature is not checked
  // with an ordinary short-circuiting string comparison.
  if (!/^[0-9a-f]{64}$/.test(actual) || !/^[0-9a-f]{64}$/.test(expected))
    return false;
  const decode = (value: string) =>
    Uint8Array.from({ length: 32 }, (_, index) =>
      Number.parseInt(value.slice(index * 2, index * 2 + 2), 16),
    );
  const left = decode(actual);
  const right = decode(expected);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean;
  };
  if (typeof subtle.timingSafeEqual === "function")
    return subtle.timingSafeEqual(left, right);
  // Node's test Web Crypto currently lacks timingSafeEqual; retain a fixed-
  // length fallback so local tests exercise the same comparison semantics.
  let difference = 0;
  for (let index = 0; index < left.length; index++)
    difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function verifyStripeSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const parts: Record<string, string[]> = {};
  for (const part of signature.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    (parts[name] ||= []).push(value);
  }
  const timestamp = Number(parts.t?.[0]);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() / 1000 - timestamp) > 300 ||
    !parts.v1?.length
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = hex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`),
    ),
  );
  let matched = false;
  for (const candidate of parts.v1)
    matched = constantTimeHexEqual(digest, candidate) || matched;
  return matched;
}
