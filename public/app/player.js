import {
  blanked,
  buildQuestions,
  buildSpeakPlan,
  checkAnswer,
  langFromPath,
  lessonFromPath,
  nextIncomplete,
  readWritePicks,
} from "./lesson-flow.js";
import { createQueue } from "./sync-queue.js";

const queue = createQueue(localStorage);

const app = document.getElementById("app");
const ACTIVITIES = ["listen-match", "image-phrase", "speak-score", "read-write"];
const ACTIVITY_LABEL = {
  "listen-match": "Listen and tap",
  "image-phrase": "Look and tap",
  "speak-score": "Say it aloud",
  "read-write": "Fill the missing word",
};

const api = {
  async me() {
    const r = await fetch("/api/me", { credentials: "include" });
    return r.ok;
  },
  async anonymous() {
    await fetch("/api/auth/sign-in/anonymous", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  },
  manifestUrl() {
    const lang = langFromPath(location.pathname);
    const lesson = lessonFromPath(location.pathname);
    if (lang === "en" && lesson === "01") return "/api/lessons/01";
    return `/api/lessons/${lang}/${lesson}`;
  },
  async manifest() {
    const r = await fetch(api.manifestUrl(), { credentials: "include" });
    if (!r.ok) throw Object.assign(new Error("manifest failed"), { status: r.status });
    return r.json();
  },
  async progress(lessonId) {
    const r = await fetch(`/api/progress?lesson=${lessonId}`, {
      credentials: "include",
    });
    return r.ok ? (await r.json()).completed : [];
  },
  async postProgress({ lessonId, activity }) {
    const r = await fetch("/api/progress", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, activity }),
    });
    // 4xx is a real rejection (bad order/unknown activity): don't retry it.
    if (!r.ok && r.status < 500) return;
    if (!r.ok) throw new Error("progress failed");
  },
  // Online: post now. Offline or 5xx: queue for later (server completion
  // is idempotent, so a lost response can't double-record).
  async complete(activity, lessonId) {
    if (!navigator.onLine) {
      queue.enqueue(activity, lessonId);
      return;
    }
    try {
      await api.postProgress({ lessonId, activity });
    } catch {
      queue.enqueue(activity, lessonId);
    }
  },
  async score(phraseId, audioBase64) {
    const r = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId, audio: audioBase64 }),
    });
    if (!r.ok) throw new Error("score failed");
    return r.json();
  },
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23dce7f8'/%3E%3Ctext x='200' y='235' font-size='120' text-anchor='middle' fill='%231a5feb'%3E%E2%99%AA%3C/text%3E%3C/svg%3E";

function appImg(attrs) {
  const el = h("img", attrs);
  el.addEventListener("error", () => {
    if (!el.src.startsWith("data:")) el.src = PLACEHOLDER;
  });
  return el;
}

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids) {
    el.append(kid instanceof Node ? kid : document.createTextNode(kid));
  }
  return el;
}

// Mandarin shows characters primary with pinyin beneath; Thai is
// vocal-only (romanization only, script never shown). Both carry
// scoreText, so gate on the phrase id prefix (same convention as the
// /api/score unspaced branch). Languages without scoreText render
// their text unchanged.
function phraseNodes(phrase) {
  if (!phrase.scoreText || !phrase.id.startsWith("zh-")) return [phrase.text];
  return [
    h("span", { class: "native" }, phrase.scoreText),
    h("span", { class: "roman" }, phrase.text),
  ];
}

function topbar(state) {
  const done = new Set(state.completed);
  const segs = (state.activities ?? ACTIVITIES).map((a) =>
    h(
      "i",
      { class: done.has(a) ? "done" : a === state.activity ? "now" : "" },
    ),
  );
  return h(
    "div",
    { class: "topbar" },
    h("div", { class: "brand", aria_hidden: "true" }, "N"),
    h("div", { class: "segments" }, ...segs),
    h("div", { class: "step" }, state.stepText ?? ""),
  );
}

function readLocalCompleted(lessonId) {
  try {
    return JSON.parse(localStorage.getItem(`nicelingo:completed:${lessonId}`) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocalCompleted(lessonId, completed) {
  try {
    localStorage.setItem(`nicelingo:completed:${lessonId}`, JSON.stringify(completed));
  } catch {
    /* private mode: resume degrades to activity one */
  }
}

function updateOfflineBanner() {
  let bar = document.getElementById("offline-bar");
  if (navigator.onLine) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = h("div", { id: "offline-bar" }, "Offline — your progress will sync.");
    document.body.prepend(bar);
  }
}

function confetti() {
  const colors = ["#8CC8FF", "#FFB061", "#FFE066", "#7FE3C4", "#FF9DB5"];
  for (let i = 0; i < 70; i++) {
    const c = h("div", { class: "confetti" });
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.borderRadius = i % 2 ? "50%" : "2px";
    document.body.append(c);
    setTimeout(() => c.remove(), 3400);
  }
}

function playAudio(url, btn) {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    btn?.classList.add("playing");
    audio.onended = audio.onerror = () => {
      btn?.classList.remove("playing");
      resolve();
    };
    audio.play().catch(() => {
      btn?.classList.remove("playing");
      resolve();
    });
  });
}

const player = {
  manifest: null,
  state: { activity: null, completed: [], stepText: "" },

  async boot() {
    this.screen(h("div", { class: "loading" }, h("div", { class: "spin" }), h("p", {}, "Getting your lesson ready…")));
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
      updateOfflineBanner();
      window.addEventListener("online", () => {
        updateOfflineBanner();
        queue.flush(api.postProgress).catch(() => {});
      });
      window.addEventListener("offline", updateOfflineBanner);
      // Offline boot: skip session + sync, read manifest and progress
      // from local caches. First-ever visit offline still lands on retry.
      const offline = !navigator.onLine;
      if (!offline) {
        if (!(await api.me())) await api.anonymous();
        await queue.flush(api.postProgress).catch(() => {});
      }
      this.manifest = await api.manifest();
      // Vocal-only languages omit read-write; stale caches fall back.
      this.state.activities = this.manifest.activities ?? ACTIVITIES;
      const params = new URLSearchParams(location.search);
      // Practice runs replay all activities without reading or writing
      // progress: earned completion stays untouched.
      this.practice = params.get("practice") === "1";
      this.state.completed = this.practice
        ? []
        : offline
          ? readLocalCompleted(this.manifest.id)
          : await api.progress(this.manifest.id);
      const demo = params.get("demo");
      const start =
        demo && this.activities().includes(demo)
          ? demo
          : nextIncomplete(this.activities(), this.state.completed);
      if (!start) return this.lessonDone();
      // Browsers block audio before a tap: one start gate unlocks sound
      // for the whole lesson. Demo links skip it for screenshots.
      if (demo) return this.startActivity(start);
      this.startGate(start);
    } catch (e) {
      if (e && (e.status === 401 || e.status === 402)) return this.paywall();
      this.screen(
        h("div", { class: "screen" },
          h("div", { class: "error" }, h("b", {}, "Could not load the lesson."), h("p", {}, "Check your connection and try again.")),
          h("button", { class: "btn", onclick: () => this.boot() }, "Try again")),
      );
    }
  },

  paywall() {
    this.screen(
      h("div", { class: "screen" },
        h("div", { class: "sun" }, h("b", {}, "This lesson needs a subscription."), h("p", {}, "Unit 1 (lessons 1-4) is free forever. Unlock every lesson for $3/month or $29/year.")),
        h("a", { class: "btn", href: "/billing" }, "See plans"),
        h("p", {}, h("a", { href: "/lesson/01" }, "← Back to free Unit 1"))),
    );
  },

  screen(...nodes) {
    app.replaceChildren(...nodes);
    app.focus({ preventScroll: true });
  },

  startGate(start) {
    const go = h("button", { class: "btn sun" }, "Tap to start");
    go.addEventListener("click", () => this.startActivity(start), { once: true });
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state),
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "♪"),
          h("h1", {}, `Lesson ${Number(lessonFromPath(location.pathname))}`),
          h("p", { class: "sub" }, "See it, hear it, say it."),
          h("div", { class: "spacer" }),
          go)),
    );
  },

  startActivity(activity) {
    this.state.activity = activity;
    this.state.qIndex = 0;
    if (activity === "listen-match" || activity === "image-phrase") {
      this.state.questions = buildQuestions(this.manifest.phrases).flat();
      this.choiceQuestion();
    } else if (activity === "speak-score") {
      const byId = Object.fromEntries(this.manifest.phrases.map((p) => [p.id, p]));
      this.state.speakPlan = buildSpeakPlan(this.manifest.phrases).map((id) => byId[id]);
      this.state.attempts = [];
      this.speakQuestion();
    } else {
      const byId = Object.fromEntries(this.manifest.phrases.map((p) => [p.id, p]));
      this.state.writePlan = readWritePicks(this.manifest.phrases).map((id) => byId[id]);
      this.writeQuestion();
    }
  },

  choiceQuestion() {
    const { questions, qIndex, activity } = this.state;
    const q = questions[qIndex];
    this.state.stepText = `${qIndex + 1} of ${questions.length}`;
    let locked = false;

    const onPick = async (btn, opt) => {
      if (locked) return;
      if (checkAnswer(q, opt.id)) {
        locked = true;
        btn.classList.add("correct");
        setTimeout(() => this.nextChoice(), 850);
      } else {
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 600);
      }
    };

    const grid = h(
      "div",
      { class: "grid" },
      ...q.options.map((opt) =>
        activity === "listen-match"
          ? h("button", { class: "pick", onclick: (e) => onPick(e.currentTarget, opt) },
              appImg({ src: opt.imageUrl, alt: "" }))
          : h("button", { class: "pick", onclick: (e) => onPick(e.currentTarget, opt) },
              h("span", { class: "opt-text" }, ...phraseNodes(opt))),
      ),
    );

    const body =
      activity === "listen-match"
        ? [
            h("h1", {}, "Which picture matches?"),
            (() => {
              const b = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
              b.addEventListener("click", () => playAudio(q.target.audioUrl, b));
              setTimeout(() => playAudio(q.target.audioUrl, b), 350);
              return b;
            })(),
            grid,
          ]
        : [
            h("h1", {}, "Which sentence matches?"),
            appImg({ class: "hero-img", src: q.target.imageUrl, alt: "" }),
            grid,
          ];
    this.screen(h("div", { class: "screen" }, topbar(this.state), ...body));
  },

  nextChoice() {
    this.state.qIndex++;
    if (this.state.qIndex >= this.state.questions.length) this.activityDone();
    else this.choiceQuestion();
  },

  speakQuestion() {
    const { speakPlan, qIndex, attempts } = this.state;
    const phrase = speakPlan[qIndex];
    if (!navigator.onLine) {
      const retry = h("button", { class: "btn" }, "Try again");
      retry.addEventListener("click", () => this.speakQuestion(), { once: true });
      const listen = h("button", { class: "btn ghost" }, "Hear it again");
      listen.addEventListener("click", () => playAudio(phrase.audioUrl, null));
      this.screen(
        h("div", { class: "screen" },
          topbar(this.state),
          h("h1", {}, "Say it aloud"),
          appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
          h("div", { class: "phrase-card" }, ...phraseNodes(phrase)),
          h("div", { class: "banner yellow" },
            h("div", { class: "face" }, "!"),
            h("div", {}, h("b", {}, "Needs connection"), h("small", {}, "Speaking practice needs the internet to check you. Your other progress is safe."))),
          h("div", { class: "spacer" }),
          h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, listen, retry)),
      );
      return;
    }
    this.state.stepText = `${qIndex + 1} of ${speakPlan.length}`;
    const dots = h(
      "div",
      { class: "dots" },
      ...[0, 1, 2].map((i) =>
        h("i", { class: attempts[i] ? `used-${attempts[i]}` : "" }),
      ),
    );
    const mic = h("button", { class: "mic", "aria-label": "Record your voice" }, "🎙");
    const status = h("p", { class: "sub", style: "text-align:center" }, "Tap the mic and say the sentence.");
    mic.addEventListener("click", () => this.record(phrase, mic, status, dots), { once: true });
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state),
        h("h1", {}, "Say it aloud"),
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseNodes(phrase)),
        h("div", { class: "mic-wrap" }, mic),
        status,
        dots),
    );
  },

  async record(phrase, mic, status, dots) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      status.textContent = "No microphone found. Check permission and tap the mic to try again.";
      const retry = h("button", { class: "btn ghost" }, "Try again");
      retry.addEventListener("click", () => this.speakQuestion(), { once: true });
      mic.replaceWith(retry);
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    mic.classList.add("recording");
    const bars = h("div", { class: "bars" }, h("i"), h("i"), h("i"), h("i"), h("i"));
    status.after(bars);
    const stopped = new Promise((resolve) => {
      rec.onstop = resolve;
    });
    // One tap records a fixed window and submits on its own; the mic
    // button acts as a clock face sweeping 12-to-12 while recording.
    // Tapping again just finishes early.
    const RECORD_MS = 8000;
    mic.classList.add("clock");
    mic.style.color = "transparent";
    const hand = h("i", { class: "clock-hand" });
    mic.append(hand);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = Date.now();
    let sweep;
    let deadline;
    const doStop = () => {
      if (sweep) clearInterval(sweep);
      if (deadline) clearTimeout(deadline);
      if (rec.state !== "inactive") rec.stop();
    };
    const paint = () => {
      const pct = Math.min(100, ((Date.now() - started) / RECORD_MS) * 100);
      mic.style.setProperty("--sweep", pct.toFixed(1));
      hand.style.transform = `translateX(-50%) rotate(${(pct / 100) * 360}deg)`;
    };
    mic.addEventListener("click", doStop, { once: true });
    rec.start();
    status.textContent = "Listening… tap the mic to finish early.";
    if (!reduceMotion) {
      paint();
      sweep = setInterval(paint, 100);
    }
    deadline = setTimeout(doStop, RECORD_MS);
    await stopped;
    if (sweep) clearInterval(sweep);
    if (deadline) clearTimeout(deadline);
    stream.getTracks().forEach((t) => t.stop());
    bars.remove();
    hand.remove();
    mic.classList.remove("recording");
    mic.classList.remove("clock");
    mic.style.color = "";
    mic.disabled = true;
    status.textContent = "Checking how you did…";
    try {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { verdict } = await api.score(phrase.id, base64);
      this.state.attempts.push(verdict);
      this.speakVerdict(phrase, verdict);
    } catch {
      status.textContent = "Something went wrong scoring that. Try again.";
      mic.disabled = false;
      mic.addEventListener("click", () => this.record(phrase, mic, status, dots), { once: true });
    }
  },

  speakVerdict(phrase, verdict) {
    const { attempts, speakPlan, qIndex } = this.state;
    const last = attempts.length >= 3;
    const passed = verdict === "green";
    const copy = {
      green: ["Great!", "That sounded just right."],
      yellow: ["Almost!", last ? "Good enough — moving on." : "Try once more, a little clearer."],
      red: ["Try again", last ? "Good effort — moving on." : "Listen and repeat after the speaker."],
    }[verdict];
    const dots = h(
      "div",
      { class: "dots" },
      ...[0, 1, 2].map((i) => h("i", { class: attempts[i] ? `used-${attempts[i]}` : "" })),
    );
    const next = h("button", { class: "btn" }, passed || last ? "Continue" : "Try again");
    next.addEventListener(
      "click",
      () => {
        if (passed || last) {
          this.state.qIndex++;
          this.state.attempts = [];
          if (this.state.qIndex >= speakPlan.length) this.activityDone();
          else this.speakQuestion();
        } else {
          this.state.attempts = [...attempts];
          this.speakQuestionKeepAttempts(phrase);
        }
      },
      { once: true },
    );
    const replay = h("button", { class: "btn ghost" }, "Hear it again");
    replay.addEventListener("click", () => playAudio(phrase.audioUrl, null));
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state),
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseNodes(phrase)),
        h("div", { class: `banner ${verdict}` },
          h("div", { class: "face" }, verdict === "green" ? "✓" : verdict === "yellow" ? "≈" : "!"),
          h("div", {}, h("b", {}, copy[0]), h("small", {}, copy[1]))),
        dots,
        h("div", { class: "spacer" }),
        passed || last ? next : h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, next, replay)),
    );
  },

  speakQuestionKeepAttempts(phrase) {
    const keep = this.state.attempts;
    this.speakQuestion();
    this.state.attempts = keep;
    const dots = app.querySelector(".dots");
    if (dots) {
      [...dots.children].forEach((d, i) => {
        d.className = keep[i] ? `used-${keep[i]}` : "";
      });
    }
  },

  writeQuestion() {
    const { writePlan, qIndex } = this.state;
    const phrase = writePlan[qIndex];
    const b = blanked(phrase.text);
    this.state.stepText = `${qIndex + 1} of ${writePlan.length}`;
    const input = h("input", {
      type: "text",
      autocomplete: "off",
      autocapitalize: "off",
      "aria-label": "Missing word",
      placeholder: "Type it…",
    });
    const msg = h("p", { class: "sub", style: "text-align:center;min-height:1.5em" }, "");
    const check = async () => {
      if (b.check(input.value)) {
        msg.textContent = "Correct!";
        setTimeout(() => {
          this.state.qIndex++;
          if (this.state.qIndex >= writePlan.length) this.activityDone();
          else this.writeQuestion();
        }, 800);
      } else {
        msg.textContent = "Not quite — listen again and try.";
      }
    };
    const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
    speaker.addEventListener("click", () => playAudio(phrase.audioUrl, speaker));
    setTimeout(() => playAudio(phrase.audioUrl, speaker), 350);
    const go = h("button", { class: "btn" }, "Check");
    go.addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state),
        h("h1", {}, "Fill the missing word"),
        speaker,
        h("div", { class: "phrase-card" }, b.prompt),
        h("div", { class: "write-row" }, input, go),
        msg),
    );
  },

  async activityDone() {
    const done = this.state.activity;
    if (!this.practice) {
      try {
        await api.complete(done, this.manifest.id);
      } catch {
        /* progress resumes server-side; display continues */
      }
      writeLocalCompleted(
        this.manifest.id,
        [...this.state.completed, done],
      );
    }
    this.state.completed = [...this.state.completed, done];
    const next = nextIncomplete(this.activities(), this.state.completed);
    confetti();
    const btn = h("button", { class: "btn sun" }, next ? "Continue" : "Finish lesson");
    btn.addEventListener(
      "click",
      () => (next ? this.startActivity(next) : this.lessonDone()),
      { once: true },
    );
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state),
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "★ ★ ★"),
          h("h1", {}, "Activity complete!"),
          h("p", { class: "sub" }, ACTIVITY_LABEL[done]),
          h("div", { class: "spacer" }),
          btn)),
    );
  },

  lessonDone() {
    confetti();
    setTimeout(confetti, 900);
    const practice = this.practice;
    const again = practice
      ? h("button", { class: "btn", onclick: () => this.replayPractice() }, "Practice again")
      : h("button", { class: "btn", onclick: () => { location.href = `${location.pathname}?practice=1`; } }, "Practice again");
    this.screen(
      h("div", { class: "screen" },
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "★ ★ ★"),
          h("h1", {}, practice ? "Practice complete!" : `Lesson ${Number(lessonFromPath(location.pathname))} complete!`),
          h("p", { class: "sub" }, practice ? "Nice work — run it back anytime." : "You can hear it, read it, and say it."),
          h("div", { class: "spacer" }),
          again,
          h("p", {}, h("a", { href: "/" }, "← All lessons")))),
    );
  },

  activities() {
    return this.manifest?.activities ?? ACTIVITIES;
  },

  replayPractice() {
    this.state.completed = [];
    this.state.activity = null;
    this.startGate(this.activities()[0]);
  },
};

player.boot();
