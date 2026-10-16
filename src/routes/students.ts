// Students page (/students): linked-accounts progress viewing.
// A registered holder requests a link by the student's email; the
// student accepts or declines (requests also appear here, since every
// account can be both holder and student). Accepted students show a
// per-language summary. All mutations go through /api/students/*.
import { escapeHtml } from "../lib/lesson-progress";
import { MAX_STUDENTS, type StudentSummary } from "../lib/students";
import { pickerLanguages } from "../lessons/languages";
import { brandHtml, pageShell } from "./shell";

export type StudentCard = {
  linkId: string;
  email: string | null;
  name: string | null;
  summary: StudentSummary;
};

export type StudentsData = {
  email: string;
  students: StudentCard[];
  outgoingPending: { linkId: string; email: string | null }[];
  incomingPending: { linkId: string; email: string | null; name: string | null }[];
  viewers: { linkId: string; email: string | null }[];
};

const STYLE = `<style>
.students{max-width:720px;margin:2rem auto}
.students h1{font-size:1.6rem;color:#0e1b3d;margin:0 0 .5rem}
.students h2{font-size:1.15rem;color:#0e1b3d;margin:2rem 0 .75rem}
.students p{color:#3c4f78;line-height:1.5}
.scard{background:#fff;border:1px solid #dbe6f7;border-radius:16px;padding:1.25rem 1.5rem;margin:0 0 1rem}
.scard h3{margin:0 0 .25rem;color:#0e1b3d}
.scard .meta{color:#5a6b8c;font-size:.92rem;margin:0 0 .75rem}
.scard table{width:100%;border-collapse:collapse;font-size:.95rem}
.scard th,.scard td{text-align:left;padding:.4rem .5rem;border-top:1px solid #e6eefb;color:#24365e}
.scard th{color:#5a6b8c;font-weight:600;border-top:none}
.students label{display:block;font-weight:700;color:#0e1b3d;margin:1rem 0 .3rem}
.students input[type=email]{width:100%;box-sizing:border-box;font-size:1rem;padding:.8rem;border:2px solid #d3e2f5;border-radius:12px;min-height:52px}
.students .btn{margin-top:1rem}
.btn-small{padding:.45rem .9rem;font-size:.92rem}
.auth-err{color:#b3261e;min-height:1.4em}
.row-actions{display:flex;gap:.5rem;flex-wrap:wrap}
</style>`;

function langName(code: string): string {
  return pickerLanguages().find((l) => l.code === code)?.name ?? code.toUpperCase();
}

function dateLabel(ms: number | null): string {
  if (!ms) return "no activity yet";
  return new Date(ms).toISOString().slice(0, 10);
}

function studentCard(card: StudentCard): string {
  const title = escapeHtml(card.name || card.email || "Student");
  const rows = card.summary.languages
    .map(
      (l) => `<tr><th>${escapeHtml(langName(l.lang))}</th><td>${l.lessonsDone} of ${l.lessonsTotal} lessons done</td><td>${l.nextLesson ? `Next: lesson ${Number(l.nextLesson)}${l.nextLessonTitle ? ` · ${escapeHtml(l.nextLessonTitle)}` : ""}` : "Course complete"}</td><td>Last active ${dateLabel(l.lastActivityAt)}</td></tr>`,
    )
    .join("");
  const body = rows
    ? `<table>${rows}</table>`
    : `<p class="meta">No lessons started yet.</p>`;
  return `<article class="scard"><h3>${title}</h3><p class="meta">${escapeHtml(card.email ?? "")}</p>${body}<div class="row-actions"><button class="btn btn-small" type="button" data-remove="${card.linkId}">Remove student</button></div></article>`;
}

export function studentsPage(data: StudentsData, origin = ""): string {
  const incoming = data.incomingPending.length
    ? `<h2>Requests for you</h2>${data.incomingPending
        .map(
          (r) => `<article class="scard"><h3>${escapeHtml(r.name || r.email || "Someone")}</h3><p class="meta">${escapeHtml(r.email ?? "")} would like to see your progress.</p><div class="row-actions"><button class="btn btn-small" type="button" data-respond="accept" data-link="${r.linkId}">Accept</button><button class="btn btn-small" type="button" data-respond="decline" data-link="${r.linkId}">Decline</button></div></article>`,
        )
        .join("")}`
    : "";
  const students = data.students.length
    ? data.students.map(studentCard).join("")
    : `<p>You have no linked students yet. Add one below — they must already have a free Nicelingo account, and they will be asked to accept.</p>`;
  const pending = data.outgoingPending.length
    ? `<h2>Waiting for acceptance</h2>${data.outgoingPending
        .map(
          (r) => `<article class="scard"><p class="meta" style="margin:0">${escapeHtml(r.email ?? "")} — requested, not yet accepted.</p><div class="row-actions"><button class="btn btn-small" type="button" data-remove="${r.linkId}">Cancel request</button></div></article>`,
        )
        .join("")}`
    : "";
  const viewers = data.viewers.length
    ? `<h2>People who can see your progress</h2>${data.viewers
        .map(
          (r) => `<article class="scard"><p class="meta" style="margin:0">${escapeHtml(r.email ?? "")}</p><div class="row-actions"><button class="btn btn-small" type="button" data-remove="${r.linkId}">Stop sharing</button></div></article>`,
        )
        .join("")}`
    : "";

  const inner = `<header class="site-head">${brandHtml()}<span class="head-sp"></span><a class="btn-outline btn" href="/account">Account</a></header>
<main class="students">
<h1>Your students</h1>
<p>Link a student's own free Nicelingo account to see their progress here. You can link up to ${MAX_STUDENTS} students. A student only appears after they accept your request.</p>
${incoming}
<h2>Students</h2>
${students}
${pending}
<h2>Add a student</h2>
<form id="add-form">
<label for="email">Student's account email</label>
<input id="email" type="email" autocomplete="email" required placeholder="student@example.com">
<p class="auth-err" id="err" role="alert"></p>
<button class="btn" type="submit">Send link request</button>
</form>
${viewers}
</main>
${STYLE}
<script>
const post = async (url, body) => {
  const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Something went wrong.");
  return data;
};
document.getElementById("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  err.textContent = "";
  try {
    await post("/api/students/request", { email: document.getElementById("email").value.trim() });
    location.reload();
  } catch (ex) { err.textContent = ex.message; }
});
document.querySelectorAll("[data-respond]").forEach((b) => b.addEventListener("click", async () => {
  try { await post("/api/students/respond", { linkId: b.dataset.link, accept: b.dataset.respond === "accept" }); location.reload(); } catch {}
}));
document.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", async () => {
  try { await post("/api/students/remove", { linkId: b.dataset.remove }); location.reload(); } catch {}
}));
</script>`;
  return pageShell({ title: "Your students · Nicelingo", origin, noindex: true, body: inner });
}
