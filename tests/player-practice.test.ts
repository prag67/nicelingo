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

function installStubs(search) {
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
    pathname: "/lesson/001",
    search,
    href: `http://x/lesson/001${search}`,
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
    if (String(url).startsWith("/api/progress?"))
      return { ok: true, status: 200, json: async () => ({ completed: ALL }) };
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

describe("paywall screen", () => {
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
    expect(screenText()).toContain("Back to free Unit 1");
  });

  it("shows the paywall screen for logged-out guests (401)", async () => {
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
