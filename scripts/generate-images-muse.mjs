// One-time image generation for lesson manifests via Muse Image 1.0.
// Usage: MODEL_API_KEY=... node scripts/generate-images-muse.mjs [NN]
// Combos come from scripts/manifests/en-{NN}.json (images are shared across
// languages); prompts compose NOUN_SUBJECTS x VERB_ACTIONS so new lessons
// need no new code unless a combo needs a special-case in OVERRIDES.
// Falls back to the Muse CLI's stored key (~/.config/muse/auth.json).
// Re-runnable: skips files that already exist. Prints sizes only, never secrets.
// Requires: ffmpeg (PNG normalization to .jpg).
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir, homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "muse-image-1.0";
const STYLE =
  "clean simple stock photograph, single subject, plain light background, natural daylight";

const ANIMALS = new Set(["dog", "cat", "bird", "horse", "rabbit", "puppy", "kitten", "bunny", "chick"]);

const NOUN_SUBJECTS = {
  man: "one adult man",
  woman: "one adult woman",
  boy: "one young boy, child around 8 years old",
  girl: "one young girl, child around 8 years old",
  mother: "one adult woman as a mother",
  father: "one adult man as a father",
  sister: "one young woman as a sister",
  brother: "one young man as a brother",
  dog: "one dog",
  cat: "one cat",
  bird: "one bird",
  horse: "one horse",
  rabbit: "one rabbit",
  teacher: "one teacher",
  doctor: "one doctor",
  farmer: "one farmer",
  driver: "one driver",
  runner: "one runner",
  swimmer: "one swimmer",
  player: "one soccer player",
  cyclist: "one cyclist",
  singer: "one singer",
  drummer: "one drummer",
  dancer: "one dancer",
  guitarist: "one guitarist",
  grandfather: "one elderly man as a grandfather",
  grandmother: "one elderly woman as a grandmother",
  uncle: "one adult man as an uncle",
  cousin: "one young woman as a cousin",
  cook: "one cook",
  baker: "one baker",
  waiter: "one waiter",
  cleaner: "one cleaner",
  puppy: "one puppy",
  kitten: "one kitten",
  bunny: "one bunny",
  chick: "one baby chick",
};

const VERB_ACTIONS = {
  eating: "eating a meal with a spoon at a table",
  drinking: "drinking a glass of water",
  reading: "reading an open book",
  writing: "writing in a notebook with a pen",
  running: "running",
  sleeping: "sleeping",
  walking: "walking",
  swimming: "swimming in water",
  cooking: "cooking food in a pan",
  playing: "playing with a ball",
  working: "working at a desk with a laptop",
  shopping: "shopping with a shopping bag",
  laughing: "laughing",
  crying: "crying",
  jumping: "jumping",
  talking: "talking",
  listening: "listening wearing headphones",
  clapping: "clapping hands",
  waving: "waving hello",
  diving: "diving into a swimming pool",
  smiling: "smiling",
  dancing: "dancing",
  singing: "singing",
  drawing: "drawing a picture",
  hiding: "hiding behind a wall",
};

const ANIMAL_VERB_ACTIONS = {
  eating: "eating food from a bowl",
  drinking: "drinking water from a bowl",
};

// Past-tense (completed-action) depictions. Only verbs where completion is
// unambiguous in a still image get a variant; the rest reuse the action
// image and let the audio carry the tense (a runner mid-run reads as
// "ran" when the audio says so, but a full bowl mid-bite contradicts "ate").
const VERB_ACTIONS_PAST = {
  eating: "sitting at a table with an empty plate and fork put down after finishing a meal, satisfied",
  drinking: "sitting at a table with an empty glass set down after finishing a drink",
  cooking: "standing next to a stove holding up a finished dish of food",
  drawing: "holding up a finished drawing",
  writing: "sitting at a desk with a finished letter in front",
  shopping: "standing with full shopping bags",
  working: "relaxing at a desk with a closed laptop after finishing work",
};

const ANIMAL_VERB_ACTIONS_PAST = {
  eating: "sitting next to an empty food bowl after finishing eating",
  drinking: "sitting next to an empty water bowl after finishing drinking",
};

// Combo-specific prompt overrides: "noun-verb" -> full subject phrase.
const OVERRIDES = {
  "boy-swimming": "one young boy swimming in a swimming pool wearing a blue swim shirt",
  "girl-swimming": "one young girl splashing and playing in a swimming pool with eyes open and smiling, wearing a red t-shirt",
  "boy-diving": "one young boy diving into a swimming pool wearing a blue swim shirt",
  "girl-diving": "one young girl jumping into a swimming pool wearing a red t-shirt",
  "cyclist-jumping": "one cyclist jumping high in the air, no bicycle",
  "swimmer-sleeping": "one swimmer napping on a bench wearing a tracksuit",
  "swimmer-playing": "one swimmer wearing a tracksuit playing with a ball",
  "cyclist-swimming": "one cyclist swimming in water, no bicycle",
  "cyclist-running": "one cyclist running on foot, no bicycle",
  "driver-playing": "one delivery driver in uniform and cap kicking a soccer ball",
  "driver-running": "one delivery driver in uniform and cap running",
  "singer-clapping": "one singer on a stage clapping with a microphone stand nearby",
  "player-wanting": "one adult soccer player looking eagerly at a swimming pool, daydreaming about swimming",
};

function apiKey() {
  if (process.env.MODEL_API_KEY) return process.env.MODEL_API_KEY;
  try {
    const auth = JSON.parse(
      readFileSync(join(homedir(), ".config", "muse", "auth.json"), "utf8"),
    );
    return auth?.providers?.meta?.api_key ?? null;
  } catch {
    return null;
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lesson = process.argv[2] ?? "01";
const manifestPath = join(root, "scripts", "manifests", `en-${lesson}.json`);
if (!existsSync(manifestPath)) {
  console.error(`unknown lesson ${lesson}; want 01-16 with a dumped manifest`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// Tense comes from the curriculum row (manifests don't carry it).
const curriculum = readFileSync(join(root, "src", "lessons", "curriculum.ts"), "utf8");
const row = curriculum.match(new RegExp(`"${lesson}":\\s*\\{[^}]*\\}`))?.[0] ?? "";
const isPast = row.includes('tense: "past"');

const key = apiKey();
if (!key) {
  console.error("missing MODEL_API_KEY and no stored Muse CLI key");
  process.exit(1);
}

for (const phrase of manifest.phrases) {
  const combo = phrase.imageUrl.split("/").pop().replace(/\.jpg$/, "");
  const dest = join(root, "public", phrase.imageUrl);
  if (existsSync(dest)) {
    console.log(`${combo}: exists, skipping`);
    continue;
  }
  const [noun, verb] = combo.split("-");
  const subject = NOUN_SUBJECTS[noun];
  // L4 opinions: the liked/wanted action comes from the curriculum row's
  // object field; liking shows joyful doing, wanting eager longing.
  const object = row.match(/object: "([a-z]+)"/)?.[1];
  let action;
  if (verb === "liking" || verb === "wanting") {
    const objAction = object ? VERB_ACTIONS[object] : undefined;
    if (!objAction) {
      console.error(`${combo}: opinion verb without a known object`);
      process.exit(1);
    }
    action =
      verb === "liking"
        ? `${objAction}, smiling with joy and satisfaction`
        : `gazing with eager longing toward ${objAction}`;
  } else {
    action = ANIMALS.has(noun)
      ? ((isPast && ANIMAL_VERB_ACTIONS_PAST[verb]) ||
        ANIMAL_VERB_ACTIONS[verb] ||
        VERB_ACTIONS[verb])
      : ((isPast && VERB_ACTIONS_PAST[verb]) || VERB_ACTIONS[verb]);
  }
  if (!subject || !action) {
    console.error(`${combo}: no prompt mapping for noun=${noun} verb=${verb}`);
    process.exit(1);
  }
  const prompt = `${STYLE} of ${OVERRIDES[combo] ?? `${subject} ${action}`}, no other people`;
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch("https://api.meta.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, prompt }),
  });
  if (!res.ok) {
    console.error(`${combo}: HTTP ${res.status}`);
    console.error((await res.text()).slice(0, 300));
    process.exit(1);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.error(`${combo}: no b64_json in response`);
    process.exit(1);
  }
  const tmp = join(tmpdir(), `nicelingo-${combo}.img`);
  writeFileSync(tmp, Buffer.from(b64, "base64"));
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    tmp,
    "-q:v",
    "4",
    dest,
  ]);
  console.log(`${combo}: done`);
}
console.log("done");
