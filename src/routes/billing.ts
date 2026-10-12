import { coverageLine, pickerLanguages } from "../lessons/languages";
import { escapeHtml } from "../lib/lesson-progress";

export const MONTHLY_PRICE_LABEL = "$3/month";
export const YEARLY_PRICE_LABEL = "$29/year";

/**
 * Same-origin return path for post-billing navigation (locked cards link
 * /billing?return=/{lang}?level=N). Single leading slash only — absolute
 * URLs, protocol-relative URLs, and backslash tricks fall back to "/".
 */
export function safeReturnPath(raw: string | undefined | null): string {
  if (typeof raw !== "string" || !/^\/(?!\/)[^\s\\"<>\\]*$/.test(raw)) {
    return "/";
  }
  return raw;
}

/** Stripe success/cancel URLs carrying the return target through checkout. */
export function checkoutReturnUrls(
  origin: string,
  rawReturn: string | undefined | null,
): { successUrl: string; cancelUrl: string } {
  const ret = encodeURIComponent(safeReturnPath(rawReturn));
  return {
    successUrl: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}&return=${ret}`,
    cancelUrl: `${origin}/billing/cancel?return=${ret}`,
  };
}

const STYLE = `body{font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;line-height:1.6;color:#0e1b3d;background:#eef6ff}
h1{font-size:1.8rem}
.plans{display:grid;gap:1rem;margin:1.5rem 0}
.plan{border:2px solid #0e1b3d;border-radius:16px;padding:1.25rem;background:#fff}
.plan h2{margin:0 0 0.25rem}
.plan p{margin:0.25rem 0 1rem;color:#4c5873}
.btn{display:inline-block;background:#1a5feb;color:#fff;border:none;border-radius:16px;box-shadow:0 4px 0 #0f3fae;padding:0.8rem 1.5rem;font-size:1.05rem;font-weight:800;cursor:pointer;min-height:56px;text-decoration:none}
.btn.secondary{background:#fff;color:#0e1b3d;border:2px solid #0e1b3d;box-shadow:0 4px 0 #0e1b3d}
input[type=email]{width:100%;box-sizing:border-box;font-size:1rem;padding:0.8rem;border:2px solid #d3e2f5;border-radius:12px;margin:0.5rem 0 1rem;min-height:56px;background:#fff;color:#0e1b3d}
.note{color:#4c5873;font-size:0.95rem}
.error{color:#b00020;font-weight:600}
a{color:#1247b8}`;

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Nicelingo</title>
<meta name="theme-color" content="#1a5feb">
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/logo/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/logo/apple-touch-icon.png">
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function billingPage(rawReturn?: string): string {
  const back = escapeHtml(safeReturnPath(rawReturn));
  return shell(
    "Subscribe",
    `<h1>Nicelingo Premium</h1>
<p>Unit 1 (lessons 1-4) is free forever. A subscription unlocks every lesson in every language — ${coverageLine()} — all levels, present and future.</p>
<ul>${pickerLanguages().map((l) => `<li><b>${l.name}</b> · ${l.lessons} lessons${l.status === "partial" ? " (Level 1 only)" : ""}</li>`).join("")}</ul>
<label for="email"><b>Email for your receipt</b></label>
<input type="email" id="email" placeholder="you@example.com" autocomplete="email">
<div class="plans" data-return="${back}">
<div class="plan"><h2>Monthly · ${MONTHLY_PRICE_LABEL}</h2><p>Cancel anytime from your receipt or account page.</p><button class="btn" data-plan="monthly">Subscribe monthly</button></div>
<div class="plan"><h2>Yearly · ${YEARLY_PRICE_LABEL}</h2><p>Two months free, one payment a year.</p><button class="btn" data-plan="yearly">Subscribe yearly</button></div>
</div>
<p class="note">Payments are handled securely by Stripe. Manage or cancel anytime: <button class="btn secondary" id="manage">Manage subscription</button></p>
<p class="error" id="err" role="alert"></p>
<p><a href="${back}">← Back to lessons</a></p>
<script>
(async () => {
  const backTo = document.querySelector(".plans")?.dataset.return || "/";
  try {
    const me = await fetch("/api/me", { credentials: "include" });
    if (me.ok) {
      const { user } = await me.json();
      if (user && user.email && !user.isAnonymous) document.getElementById("email").value = user.email;
    } else {
      await fetch("/api/auth/sign-in/anonymous", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
    }
  } catch {}
  const err = document.getElementById("err");
  document.querySelectorAll("[data-plan]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      err.textContent = "";
      const email = document.getElementById("email").value.trim();
      if (!email || !email.includes("@")) { err.textContent = "Enter your email for the receipt."; return; }
      const r = await fetch("/api/billing/checkout", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: btn.dataset.plan, email, return: backTo }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.url) { err.textContent = body.error || "Checkout failed. Try again."; return; }
      location.href = body.url;
    });
  });
  document.getElementById("manage").addEventListener("click", async () => {
    err.textContent = "";
    const r = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || !body.url) { err.textContent = body.error || "No subscription found for this account."; return; }
    location.href = body.url;
  });
})();
</script>`,
  );
}

export function billingSuccessPage(
  verified: boolean,
  rawReturn?: string,
): string {
  const back = escapeHtml(safeReturnPath(rawReturn));
  return shell(
    "Subscribed",
    verified
      ? `<h1>You're subscribed 🎉</h1><p>Your payment went through. All lessons are unlocked.</p><p><a href="${back}">Start learning →</a></p>`
      : `<h1>Almost there…</h1><p>We're confirming your payment — this usually takes a few seconds. <a href="${back}">Back to lessons</a> and your progress will unlock automatically.</p>`,
  );
}

export function billingCancelPage(rawReturn?: string): string {
  const back = escapeHtml(safeReturnPath(rawReturn));
  return shell(
    "Checkout cancelled",
    `<h1>Checkout cancelled</h1><p>No charge was made. Unit 1 is still free whenever you want it.</p><p><a href="${back}">← Back to lessons</a></p>`,
  );
}
