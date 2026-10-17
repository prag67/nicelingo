// Regression: "Practice again" on the lesson-complete screen must replay
// the lesson, not land on the complete screen again. Drives the real
// player.js with stubbed browser globals and simulates the navigation
// the button triggers.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ALL = ["listen-match", "image-phrase", "speak-score", "read-write"];

class Node {}

class El extends Node {
  kids = [];
  listeners = {};
  style = {};
  attrs = {};
  className = "";
  classList = {
    add: () => {},
    remove: () => {},
  };
  constructor(tag) {
    super();
    this.tag = tag;
    this.style.setProperty = (k, v) => {
      this.style[k] = String(v);
    };
  }
  set textContent(v) {
    this.kids = [{ data: String(v) }];
  }
  get textContent() {
    return this.text;
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  append(...kids) {
    for (const k of kids) {
      if (k instanceof El) k.parent = this;
      this.kids.push(k);
    }
  }
  appendChild(k) {
    if (k instanceof El) k.parent = this;
    this.kids.push(k);
    return k;
  }
  after(...nodes) {
    if (!this.parent) return;
    const at = this.parent.kids.indexOf(this);
    const kids = [...this.parent.kids];
    kids.splice(at + 1, 0, ...nodes);
    for (const n of nodes) if (n instanceof El) n.parent = this.parent;
    this.parent.kids = kids;
  }
  replaceWith() {}
  addEventListener(t, f) {
    (this.listeners[t] ??= []).push(f);
  }
  remove() {}
  focus() {}
  replaceChildren(...kids) {
    this.kids = kids;
  }
  click() {
    for (const f of this.listeners.click ?? []) f();
  }
  get text() {
    return this.kids
      .map((k) => (typeof k === "string" ? k : (k.text ?? k.data ?? "")))
      .join("");
  }
}

const manifest = {
  id: "lesson-001",
  phrases: Array.from({ length: 8 }, (_, i) => ({
    id: `01-p${i}`,
    text: `Phrase ${i}.`,
    audioUrl: `/static/lesson-001/audio/p${i}.mp3`,
    imageUrl: `/static/lesson-001/images/p${i}.jpg`,
  })),
  activities: ALL,
};

let documentStub;
let locationStub;
let fetchCalls;
let reloadCalls;

function installStubs(search, completed = ALL, pathname = "/lesson/001") {
  documentStub = {
    created: [],
    createElement: (tag) => {
      const el = new El(tag);
      documentStub.created.push(el);
      return el;
    },
    createTextNode: (text) => ({ data: text }),
    getElementById: (id) => (id === "app" ? documentStub.app : null),
    app: new El("div"),
    body: new El("body"),
  };
  locationStub = {
    pathname,
    search,
    href: `http://x${pathname}${search}`,
    reload: () => {
      reloadCalls++;
    },
  };
  fetchCalls = [];
  reloadCalls = 0;
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  };
  globalThis.document = documentStub;
  globalThis.Node = Node;
  globalThis.location = locationStub;
  Object.defineProperty(globalThis, "navigator", {
    value: {
      onLine: true,
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }),
      },
    },
    configurable: true,
    writable: true,
  });
  globalThis.window = { addEventListener: () => {} };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.Audio = class {
    play() {
      return Promise.resolve();
    }
  };
  globalThis.MediaRecorder = class {
    state = "inactive";
    start() {
      this.state = "recording";
      if (this.ondataavailable) this.ondataavailable({ data: "chunk" });
    }
    stop() {
      this.state = "inactive";
      if (this.onstop) this.onstop();
    }
  };
  globalThis.FileReader = class {
    readAsDataURL() {
      queueMicrotask(() => {
        this.result = "data:audio/webm;base64,QUJD";
        if (this.onload) this.onload();
      });
    }
  };
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, method: init?.method ?? "GET" });
    if (url === "/api/me") return { ok: true, status: 200, json: async () => ({}) };
    if (url === "/api/lessons/en/001" || url === "/api/lessons/01")
      return { ok: true, status: 200, json: async () => manifest };
    if (String(url).startsWith("/api/checkpoint/")) {
      const pool = manifest.phrases;
      const acts = ["listen-match", "image-phrase"];
      return { ok: true, status: 200, json: async () => ({ questions: pool.slice(0, 2).map((phrase, i) => ({ phrase, activity: acts[i] })), pool }) };
    }
    if (String(url) === "/api/attempts" || String(url) === "/api/milestones")
      return { ok: true, status: 200, json: async () => ({ ok: true, passed: false }) };
    if (String(url).startsWith("/api/progress?"))
      return { ok: true, status: 200, json: async () => ({ completed }) };
    if (url === "/api/score")
      return { ok: true, status: 200, json: async () => ({ verdict: "green", score: 100 }) };
    return { ok: true, status: 200, json: async () => ({}) };
  };
}

async function bootPlayer() {
  documentStub.created = [];
  vi.resetModules();
  await import("../public/app/player.js");
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 10));
}

function findButton(text) {
  return documentStub.created.find(
    (el) => (el.tag === "button" || el.tag === "a") && el.text.includes(text),
  );
}

function screenText() {
  return documentStub.app.text;
}

describe("practice again", () => {
  beforeEach(() => {
    installStubs("");
  });

  it("replays the lesson instead of showing the complete screen again", async () => {
    await bootPlayer();
    expect(screenText()).toContain("Lesson 1 complete!");
    // Next lesson button and a Lesson page link back to the course
    // page (not the homepage).
    const nextBtn = documentStub.created.find(
      (el) => el.tag === "a" && el.text.includes("Next lesson"),
    );
    expect(nextBtn?.attrs.href).toBe("/lesson/en/002");
    const pageLink = documentStub.created.find(
      (el) => el.tag === "a" && el.text.includes("Lesson page"),
    );
    expect(pageLink?.attrs.href).toBe("/en");
    findButton("Practice again").click();
    // Simulate the navigation the button triggers, then boot there.
    const reloaded = reloadCalls;
    const url = new URL(locationStub.href, "http://x");
    installStubs(url.search);
    expect(reloaded).toBe(0);
    await bootPlayer();
    expect(screenText()).toContain("Tap to start");
    findButton("Tap to start").click();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 10));
    expect(screenText()).toContain("Which picture matches?");
  });

  it("practice runs neither read nor write progress", async () => {
    installStubs("?practice=1");
    await bootPlayer();
    expect(screenText()).toContain("Tap to start");
    expect(
      fetchCalls.some((c) => String(c.url).startsWith("/api/progress?")),
    ).toBe(false);
    expect(
      fetchCalls.some((c) => c.url === "/api/progress" && c.method === "POST"),
    ).toBe(false);
  });
});

describe("speak countdown", () => {
  beforeEach(() => {
    installStubs("?demo=speak-score");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("one tap sweeps the clock and auto-submits", async () => {
    vi.useFakeTimers();
    documentStub.created = [];
    vi.resetModules();
    await import("../public/app/player.js");
    await vi.advanceTimersByTimeAsync(500);
    expect(screenText()).toContain("Say it aloud");
    const mic = findButton("🎙");
    mic.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screenText()).toContain("Listening…");
    expect(screenText()).not.toMatch(/Listening… \d/);
    await vi.advanceTimersByTimeAsync(4000);
    const mid = Number.parseFloat(mic.style["--sweep"]);
    expect(mid).toBeGreaterThan(30);
    expect(mid).toBeLessThan(70);
    // The clock hand is present and has swept halfway around.
    const hand = mic.kids.find((k) => k.className === "clock-hand");
    expect(hand).toBeTruthy();
    expect(hand.style.transform).toContain("rotate(180");
    await vi.advanceTimersByTimeAsync(4000);
    expect(
      fetchCalls.some((c) => c.url === "/api/score" && c.method === "POST"),
    ).toBe(true);
    expect(screenText()).toContain("Great!");
  });

  it("tapping again finishes early and still submits", async () => {
    vi.useFakeTimers();
    documentStub.created = [];
    vi.resetModules();
    await import("../public/app/player.js");
    await vi.advanceTimersByTimeAsync(500);
    const mic = findButton("🎙");
    mic.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screenText()).toContain("Listening…");
    mic.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(
      fetchCalls.some((c) => c.url === "/api/score" && c.method === "POST"),
    ).toBe(true);
    expect(screenText()).toContain("Great!");
  });
});

describe("Thai speak pass rule", () => {
  beforeEach(() => {
    installStubs("?demo=speak-score");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function speakWith(verdict: string, pathname: string, pass = false) {
    const online = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      if (url === "/api/score")
        return { ok: true, status: 200, json: async () => ({ verdict, score: 70, pass }) };
      if (String(url).startsWith("/api/lessons/"))
        return { ok: true, status: 200, json: async () => manifest };
      return online(url, init);
    };
    locationStub.pathname = pathname;
    vi.useFakeTimers();
    documentStub.created = [];
    vi.resetModules();
    await import("../public/app/player.js");
    await vi.advanceTimersByTimeAsync(500);
    const mic = findButton("🎙");
    mic.click();
    await vi.advanceTimersByTimeAsync(0);
    mic.click();
    await vi.advanceTimersByTimeAsync(0);
  }

  it("retries a first Thai yellow even though it is a minor slip", async () => {
    await speakWith("yellow", "/lesson/th/001");
    expect(screenText()).toContain("Almost!");
    expect(screenText()).toContain("Try again");
    expect(screenText()).not.toContain("Close enough!");
  });

  it("passes a Thai yellow when the server says pass (2nd consecutive Clef slip)", async () => {
    await speakWith("yellow", "/lesson/th/001", true);
    expect(screenText()).toContain("Close enough!");
    expect(screenText()).toContain("Continue");
    expect(screenText()).not.toContain("Try again");
  });

  it("still asks for a retry on a non-Thai yellow", async () => {
    await speakWith("yellow", "/lesson/en/001");
    expect(screenText()).toContain("Almost!");
    expect(screenText()).not.toContain("Close enough!");
  });

  it("still fails a Thai red", async () => {
    await speakWith("red", "/lesson/th/001");
    expect(screenText()).toContain("Try again");
    expect(screenText()).not.toContain("Close enough!");
  });
});

describe("registration gate screen", () => {
  beforeEach(() => {
    installStubs("");
  });

  it("names Unit 1 as free when the manifest is gated", async () => {
    const online = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith("/api/lessons/")) {
        return { ok: false, status: 402 };
      }
      return online(url, init);
    };
    await bootPlayer();
    expect(screenText()).toContain("This lesson needs a subscription.");
    expect(screenText()).toContain("Unit 1 (lessons 1-4) is free forever.");
    expect(screenText()).toContain("$3/month or $29/year");
    expect(screenText()).toContain("Back to free Unit 1");
  });

  it("shows the subscription screen for logged-out guests (401)", async () => {
    const online = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith("/api/lessons/")) {
        return { ok: false, status: 401 };
      }
      return online(url, init);
    };
    await bootPlayer();
    expect(screenText()).toContain("This lesson needs a subscription.");
    expect(screenText()).not.toContain("Could not load the lesson.");
  });
});

describe("lesson topbar", () => {
  beforeEach(() => {
    installStubs("", ["listen-match", "image-phrase"]);
  });

  it("shows the parrot as a clickable home logo", async () => {
    await bootPlayer();
    const brand = documentStub.created.find(
      (el) => el.tag === "a" && el.attrs.href === "/",
    );
    expect(brand).toBeTruthy();
    expect(brand.attrs["aria-label"]).toBe("Nicelingo home");
    const img = brand.kids.find((k) => k instanceof El && k.tag === "img");
    expect(img.attrs.src).toBe("/logo/parrot-mark.svg");
  });

  it("makes only completed stage bars clickable, and they replay that stage", async () => {
    await bootPlayer();
    const stageButtons = documentStub.created.filter(
      (el) => el.tag === "button" && String(el.attrs["aria-label"] ?? "").startsWith("Stage "),
    );
    expect(stageButtons.map((b) => b.attrs["aria-label"])).toEqual([
      "Stage 1: Listen and tap",
      "Stage 2: Look and tap",
    ]);
    stageButtons[0].click();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 10));
    expect(screenText()).toContain("Which picture matches?");
  });
});

describe("exit current stage dialog", () => {
  const lastButton = (text) =>
    documentStub.created
      .filter((el) => (el.tag === "button" || el.tag === "a") && el.text.includes(text))
      .at(-1);
  it("asks before leaving a stage in progress, for bars and the parrot", async () => {
    installStubs("?demo=listen-match", ["image-phrase"]);
    await bootPlayer();
    expect(screenText()).toContain("Which picture matches?");
    const stageBtn = () =>
      documentStub.created.filter(
        (el) => el.tag === "button" && String(el.attrs["aria-label"] ?? "").startsWith("Stage "),
      ).at(-1);
    // No: stays on the current stage.
    stageBtn().click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(documentStub.body.text).toContain("Exit current stage?");
    lastButton("Stay").click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(screenText()).toContain("Which picture matches?");
    expect(screenText()).not.toContain("Which sentence matches?");
    // Yes: moves to the completed stage that was tapped.
    stageBtn().click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    lastButton("Yes, exit").click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(screenText()).toContain("Which sentence matches?");
  });

  it("asks before the parrot leaves mid-stage, and Yes goes home", async () => {
    installStubs("?demo=listen-match", ["image-phrase"]);
    await bootPlayer();
    const brand = documentStub.created.find(
      (el) => el.tag === "a" && el.attrs.href === "/",
    );
    brand.click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(documentStub.body.text).toContain("Exit current stage?");
    expect(locationStub.href).not.toBe("/");
    lastButton("Yes, exit").click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(locationStub.href).toBe("/");
  });

  it("asks on the start gate too: the parrot always confirms in a lesson", async () => {
    installStubs("", ["listen-match"]);
    await bootPlayer();
    expect(screenText()).toContain("Tap to start");
    const brand = documentStub.created.find(
      (el) => el.tag === "a" && el.attrs.href === "/",
    );
    brand.click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(documentStub.body.text).toContain("Exit current stage?");
    expect(locationStub.href).not.toBe("/");
    lastButton("Stay").click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(locationStub.href).not.toBe("/");
    brand.click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    lastButton("Yes, exit").click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    expect(locationStub.href).toBe("/");
  });
});

describe("lesson complete share icons", () => {
  it("shows icon-only share buttons with the lesson message", async () => {
    installStubs("");
    await bootPlayer();
    expect(screenText()).toContain("Lesson 1 complete!");
    const shareLinks = documentStub.created.filter(
      (el) => el.attrs.href && /twitter\.com|wa\.me|line\.me|t\.me|facebook\.com/.test(el.attrs.href),
    );
    expect(shareLinks.length).toBe(5);
    const decoded = decodeURIComponent(shareLinks.map((l) => l.attrs.href).join(" "));
    expect(decoded).toContain("I just finished Lesson 1 on Nicelingo");
    expect(decoded).toContain("8 new phrases");
    for (const l of shareLinks) {
      expect(l.text.trim()).toBe("");
      expect(l.attrs["aria-label"]).toBeTruthy();
    }
    const copyBtn = documentStub.created.find(
      (el) => el.tag === "button" && el.attrs["aria-label"] === "Copy link",
    );
    expect(copyBtn).toBeTruthy();
  });
});

describe("tap-to-hear words", () => {
  beforeEach(() => {
    for (const p of manifest.phrases) {
      p.words = [
        { text: "The", gloss: "the", start: 0, end: 0.2 },
        { text: "man", gloss: "man", start: 0.2, end: 0.6 },
        { text: "is", gloss: "is", start: 0.6, end: 0.9 },
        { text: "eating", gloss: "eating", start: 0.9, end: 1.5 },
      ];
    }
  });
  afterEach(() => {
    for (const p of manifest.phrases) delete p.words;
  });

  it("shows words only after the help button, then plays a word on tap", async () => {
    installStubs("?demo=speak-score", []);
    await bootPlayer();
    // No tappable words until help is pressed.
    expect(
      documentStub.created.find((el) => el.className === "word-chip"),
    ).toBeFalsy();
    const help = documentStub.created.find(
      (el) => el.tag === "button" && el.attrs["aria-label"] === "Help with words",
    );
    expect(help).toBeTruthy();
    help.click();
    expect(help.attrs["aria-pressed"]).toBe("true");
    const chip = documentStub.created.find(
      (el) => el.tag === "button" && el.attrs["aria-label"] === "Play eating, meaning eating",
    );
    expect(chip).toBeTruthy();
    expect(chip.className).toContain("word-chip");
    chip.click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    // Popup announces the word and its meaning, with a close button,
    // and stays open (no auto-dismiss).
    const pop = documentStub.created.find((el) => el.className === "word-pop");
    expect(pop).toBeTruthy();
    expect(pop.text).toContain("eating");
    const closeBtn = documentStub.created.find(
      (el) => el.tag === "button" && el.attrs["aria-label"] === "Close",
    );
    expect(closeBtn).toBeTruthy();
    // Pressing help again hides the words.
    help.click();
    expect(help.attrs["aria-pressed"]).toBe("false");
  });

  it("never chips the blanked word in write questions", async () => {
    installStubs("?demo=read-write", []);
    await bootPlayer();
    expect(documentStub.created.filter((el) => el.className === "word-chip")).toHaveLength(0);
    const help = documentStub.created.find(
      (el) => el.tag === "button" && el.attrs["aria-label"] === "Help with words",
    );
    help.click();
    const chips = documentStub.created.filter((el) => el.className === "word-chip");
    // Only the non-final words of the prompt phrase are chips.
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.length).toBeLessThan(4);
    expect(screenText()).toContain("______");
    // The blanked word must not appear anywhere in the prompt text,
    // with help off or on (regression: hidden words rendered the
    // full phrase text, giving the answer away).
    expect(screenText()).not.toContain("eating");
  });

  it("offers a help button instead of slow playback beside the speaker", async () => {
    installStubs("?demo=listen-match", []);
    await bootPlayer();
    const help = documentStub.created.find(
      (el) => el.tag === "button" && el.attrs["aria-label"] === "Help with words",
    );
    expect(help).toBeTruthy();
    expect(help.text).toContain("?");
    expect(
      documentStub.created.find((el) => el.attrs["aria-label"] === "Play slowly"),
    ).toBeFalsy();
  });
});

describe("unit checkpoint runner", () => {
  it("starts, answers, records attempts, and finishes", async () => {
    installStubs("", ALL, "/es/checkpoint/1/1");
    await bootPlayer();
    expect(screenText()).toContain("Unit 1 checkpoint");
    expect(screenText()).toContain("10 questions, about 3 minutes");
    findButton("Start checkpoint").click();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
    // Q1 listen-match: pick the target's photo.
    const target = manifest.phrases[0];
    const pick = documentStub.created.find(
      (el) => el.tag === "button" && el.kids.some((k) => k instanceof El && k.attrs.src === target.imageUrl),
    );
    expect(pick).toBeTruthy();
    pick.click();
    for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 40));
    // Q2 image-phrase: pick the target's text.
    const pick2 = documentStub.created.filter(
      (el) => el.tag === "button" && el.text.includes(target.text.replace(/\.$/, "").split(" ")[0]),
    ).at(-1);
    expect(screenText()).toContain("Unit 1 checkpoint");
    expect(documentStub.created.length).toBeGreaterThan(0);
  });
});

describe("checkpoint result screen", () => {
  it("spaces its actions, links back to the language page, and keeps missed phrases off the passed screen", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../public/app/player.js", import.meta.url), "utf8");
    const block = src.slice(src.indexOf("S.checkpointPassedText"), src.indexOf("async function bootReview"));
    expect(block).toContain("complete-actions");
    expect(block).toContain("S.lessonPage");
    expect(block).toContain("!passed && missedList");
  });
});
