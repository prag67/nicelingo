// Account pages: register, sign in, password reset, account.
// Unit 1 is free; lessons from Lesson 5 up need a Premium subscription
// ($3/month or $29/year, via /billing). Registration saves progress and
// links students but does not itself unlock paid lessons. Forms call the
// Better Auth endpoints in src/lib/auth.ts; verification/reset mail goes
// through MailNice once configured (src/lib/email.ts).
import { escapeHtml } from "../lib/lesson-progress";
import { brandHtml, pageShell } from "./shell";
import { fmt, t, type UiLang } from "../lib/i18n";

/** Only same-origin absolute paths may be carried through auth forms. */
export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

const STYLE = `<style>
.auth-card{max-width:440px;margin:2.5rem auto;background:#fff;border:1px solid #dbe6f7;border-radius:16px;padding:1.75rem}
.auth-card h1{font-size:1.55rem;line-height:1.2;margin:0 0 .5rem;color:#0e1b3d}
.auth-card p{color:#3c4f78;line-height:1.5}
.auth-card label{display:block;font-weight:700;color:#0e1b3d;margin:1rem 0 .3rem}
.auth-card input{width:100%;box-sizing:border-box;font-size:1rem;padding:.8rem;border:2px solid #d3e2f5;border-radius:12px;min-height:52px;background:#fff;color:#0e1b3d}
.auth-card .btn{width:100%;margin-top:1.25rem}
.auth-err{color:#b3261e;min-height:1.4em;margin:.75rem 0 0}
.auth-note{color:#3c4f78;font-size:.92rem}
.auth-alt{margin-top:1.25rem;text-align:center}
.auth-card a{color:#1a5feb}
.auth-card a.btn{color:#fff}
.auth-card a.btn-back{background:#ffe066;color:#0e1b3d;box-shadow:0 5px 0 #d9a400;font-size:1.12rem;min-height:62px;margin-top:1.5rem}
.auth-card a.btn-back:hover{color:#0e1b3d}
</style>`;

function shell(
  title: string,
  origin: string,
  inner: string,
  opts: { signedInArea?: boolean; uiLang?: UiLang } = {},
): string {
  const d = t(opts.uiLang ?? "en");
  // Signed-in areas (the account page) must not offer Sign in again.
  const headerAction = opts.signedInArea
    ? `<a class="btn-outline btn" href="/students">${d.students}</a>`
    : `<a class="btn-outline btn" href="/sign-in">${d.signIn}</a>`;
  return pageShell({
    title,
    lang: opts.uiLang ?? "en",
    origin,
    noindex: true,
    body: `<header class="site-head">${brandHtml()}<span class="head-sp"></span>${headerAction}</header><main class="auth-card">${inner}</main>${STYLE}`,
  });
}

function returnField(ret: string): string {
  return `<input type="hidden" id="return" value="${escapeHtml(ret)}">`;
}

export function registerPage(returnTo?: string | null, origin = "", uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  const ret = safeReturnPath(returnTo);
  const inner = `<h1>${d.createAccountHeading}</h1>
<p>Unit 1 (lessons 1-4) is free for everyone. A free account saves your progress; Lesson 5 and up needs Premium ($3/month or $29/year).</p>
<form id="register-form">
<label for="name">${d.nameLabel}</label>
<input id="name" autocomplete="name" required>
<label for="email">${d.emailLabel}</label>
<input id="email" type="email" autocomplete="email" required>
<label for="password">${d.passwordLabel}</label>
<input id="password" type="password" autocomplete="new-password" minlength="8" required>
${returnField(ret)}
<p class="auth-err" id="err" role="alert"></p>
<button class="btn" type="submit">${d.createAccountBtn}</button>
</form>
<p class="auth-alt">${d.alreadyRegistered} <a href="/sign-in?return=${encodeURIComponent(ret)}">${d.signIn}</a></p>
<script>
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  err.textContent = "";
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const ret = document.getElementById("return").value || "/";
  try {
    const res = await fetch("/api/auth/sign-up/email", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, callbackURL: ret }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      err.textContent = data.message || "Could not create the account. Check your details and try again.";
      return;
    }
    if (data.user && data.user.emailVerified === false && !data.token) {
      err.style.color = "#146c2e";
      err.textContent = "Account created. Check your email to confirm your address, then sign in.";
      return;
    }
    location.href = ret;
  } catch {
    err.textContent = "Network error. Please try again.";
  }
});
</script>`;
  return shell("Create your free account · Nicelingo", origin, inner, { uiLang });
}

export function signInPage(returnTo?: string | null, origin = "", uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  const ret = safeReturnPath(returnTo);
  const inner = `<h1>${d.signInHeading}</h1>
<p>${d.welcomeBack}</p>
<form id="signin-form">
<label for="email">${d.emailLabel}</label>
<input id="email" type="email" autocomplete="email" required>
<label for="password">${d.passwordLabel}</label>
<input id="password" type="password" autocomplete="current-password" required>
${returnField(ret)}
<p class="auth-err" id="err" role="alert"></p>
<button class="btn" type="submit">${d.signIn}</button>
</form>
<p class="auth-alt"><a href="/forgot-password">${d.forgotPassword}</a></p>
<p class="auth-alt">${d.newToNicelingo} <a href="/register?return=${encodeURIComponent(ret)}">${d.createAccountBtn}</a></p>
<script>
document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  err.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const ret = document.getElementById("return").value || "/";
  try {
    const res = await fetch("/api/auth/sign-in/email", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, callbackURL: ret }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      err.textContent = data.code === "EMAIL_NOT_VERIFIED"
        ? "Please confirm your email first — check your inbox for the confirmation link."
        : (data.message || "Sign-in failed. Check your email and password.");
      return;
    }
    location.href = ret;
  } catch {
    err.textContent = "Network error. Please try again.";
  }
});
</script>`;
  return shell("Sign in · Nicelingo", origin, inner, { uiLang });
}

export function forgotPasswordPage(origin = "", uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  const inner = `<h1>Forgot your password?</h1>
<p>Enter your account email and we will send you a reset link.</p>
<form id="forgot-form">
<label for="email">${d.emailLabel}</label>
<input id="email" type="email" autocomplete="email" required>
<p class="auth-err" id="err" role="alert"></p>
<button class="btn" type="submit">Send reset link</button>
</form>
<p class="auth-alt"><a href="/sign-in">Back to sign in</a></p>
<script>
document.getElementById("forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  const email = document.getElementById("email").value.trim();
  try {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo: "/reset-password" }),
    });
    if (!res.ok) throw new Error("failed");
    err.style.color = "#146c2e";
    err.textContent = "If that email has an account, a reset link is on its way.";
  } catch {
    err.textContent = "Could not send the reset email. Please try again later.";
  }
});
</script>`;
  return shell("Forgot password · Nicelingo", origin, inner, { uiLang });
}

export function resetPasswordPage(token: string, origin = "", uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  const inner = `<h1>Choose a new password</h1>
<form id="reset-form">
<label for="password">New password</label>
<input id="password" type="password" autocomplete="new-password" minlength="8" required>
<input type="hidden" id="token" value="${escapeHtml(token)}">
<p class="auth-err" id="err" role="alert"></p>
<button class="btn" type="submit">Save new password</button>
</form>
<script>
document.getElementById("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  const token = document.getElementById("token").value;
  if (!token) { err.textContent = "This reset link is missing its token. Request a new one."; return; }
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: document.getElementById("password").value, token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { err.textContent = data.message || "This reset link is invalid or has expired."; return; }
    location.href = "/sign-in";
  } catch {
    err.textContent = "Network error. Please try again.";
  }
});
</script>`;
  return shell("Reset password · Nicelingo", origin, inner, { uiLang });
}

export function accountPage(origin = "", email = "", uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  const who = email
    ? `Signed in as ${escapeHtml(email)}.`
    : "Signed in.";
  const inner = `<h1>${d.yourAccount}</h1>
<p class="auth-note" id="who">${who}</p>
<p>${d.premiumAccountLine}</p>
<p><a class="btn" href="/billing">${d.premiumBtn}</a></p>
<p class="auth-note">${d.subscribeManageLine}</p>
<p><a class="btn" href="/students">${d.studentsBtn}</a></p>
<p class="auth-note">${d.studentsLine}</p>
<button class="btn" id="signout" type="button">${d.signOut}</button>
<p><a class="btn btn-back" href="/">&larr; ${d.backToLanguages}</a></p>
<script>
(async () => {
  const who = document.getElementById("who");
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) { location.href = "/sign-in?return=/account"; return; }
    const { user } = await res.json();
    who.textContent = user.isAnonymous ? "You are browsing as a guest. Create a free account to save your progress." : ("Signed in as " + (user.email || "your account") + ".");
  } catch { who.textContent = "Could not load your account."; }
  document.getElementById("signout").addEventListener("click", async () => {
    try { await fetch("/api/auth/sign-out", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch {}
    location.href = "/";
  });
})();
</script>`;
  return shell("Your account · Nicelingo", origin, inner, { signedInArea: true, uiLang });
}
