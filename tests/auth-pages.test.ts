import { describe, expect, it } from "vitest";
import app from "../src/index";
import { accountPage } from "../src/routes/auth-pages";

describe("account page", () => {
  it("shows a short Students button with the explainer underneath", async () => {
    const html = accountPage("", "ray@example.com");
    expect(html).toContain('<a class="btn" href="/students">Students</a>');
    expect(html).toContain("Link a student and see their progress.");
    // The card forces plain links blue; button links must stay white or
    // the label is blue-on-blue and only appears on hover.
    expect(html).toContain(".auth-card a.btn{color:#fff}");
  });

  it("makes Back to languages a prominent, distinctly coloured button", async () => {
    const html = accountPage("", "ray@example.com");
    expect(html).toContain('<a class="btn btn-back" href="/">&larr; Back to languages</a>');
    expect(html).toContain(".auth-card a.btn-back{background:#ffe066");
  });

  it("does not offer Sign in on the signed-in account page", async () => {
    const html = accountPage("", "ray@example.com");
    expect(html).not.toContain('href="/sign-in">Sign in</a>');
    // The header action points somewhere useful instead.
    expect(html).toContain('href="/students">Students</a>');
    // Signed-out pages keep their Sign in header.
    const register = await (await app.request("/register")).text();
    expect(register).toContain('href="/sign-in">Sign in</a>');
  });
});

describe("account route", () => {
  it("redirects signed-out visitors to sign-in instead of showing Sign out", async () => {
    const res = await app.request("/account");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(await res.text()).not.toContain("Sign out");
    // Signed-in pages must never be cached, or a stale copy with a
    // Sign out button survives sign-out in the browser's back cache.
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});
