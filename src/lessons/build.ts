/** One tappable word in a phrase (tap-to-hear). Every word now has
 *  its own isolated recording (audioUrl, one per distinct word in
 *  the language's default voice); the start/end slice of the phrase
 *  audio remains only as a fallback. chars is Mandarin only: the
 *  characters, while text holds the pinyin. */
export type PhraseWord = {
  text: string;
  gloss: string;
  start?: number;
  end?: number;
  audioUrl?: string;
  chars?: string;
};

export type LessonPhrase = {
  id: string;
  text: string;
  // Native-script scoring reference for vocal-only languages (display
  // text is romanized). Absent for en/es/de/fr, where text scores.
  scoreText?: string;
  audioUrl: string;
  // Extra voices, keyed by voice id. Absent for single-voice phrases.
  // The default voice (audioUrl) is always in the rotation.
  audioUrls?: Record<string, string>;
  imageUrl: string;
  // Tap-to-hear words. Absent until word data exists for the phrase;
  // the player then shows the phrase text as plain text.
  words?: PhraseWord[];
  // Conversation scenes only: who says this line.
  speaker?: "A" | "B";
};

/** Split a clip duration across words, weighted by token length.
 *  Guarantees slices of at least 80 ms in order with no overlap by
 *  construction (weights are floored, then any slice under the floor
 *  borrows from the longest neighbour). scripts/build-words.mjs
 *  mirrors this to validate generated data — keep them in sync. */
export function wordSlices(duration: number, weights: number[]): { start: number; end: number }[] {
  const MIN = 0.085; // floor after 3-decimal rounding stays >= 80 ms
  const w = weights.map((x) => Math.max(x, 1));
  const total = w.reduce((a, b) => a + b, 0);
  const lens = w.map((x) => (duration * x) / total);
  for (let i = 0; i < lens.length; i++) {
    if (lens[i] < MIN) {
      const need = MIN - lens[i];
      let donor = -1;
      for (let j = 0; j < lens.length; j++) {
        if (j !== i && (donor < 0 || lens[j] > lens[donor])) donor = j;
      }
      if (donor >= 0 && lens[donor] - need >= MIN) {
        lens[donor] -= need;
        lens[i] = MIN;
      }
    }
  }
  const out: { start: number; end: number }[] = [];
  let t = 0;
  for (const len of lens) {
    out.push({ start: Number(t.toFixed(3)), end: Number((t + len).toFixed(3)) });
    t += len;
  }
  return out;
}

export type LessonManifest = {
  id: string;
  kind?: "photo" | "conversation";
  phrases: LessonPhrase[];
  activities: string[];
};

/** One line in a conversation scene (Phase 2). The phrase carries
 *  speaker so the player can render chat bubbles and role-play. */
export type ConversationManifest = {
  id: string;
  unit: number;
  title: string;
  imageUrl: string;
  speakers: Record<"A" | "B", { voice: string; avatarUrl?: string }>;
  /** Lines in scene order; each is a normal phrase plus speaker. */
  lines: (LessonPhrase & { speaker: "A" | "B"; alternatives?: string[] })[];
  comprehension?: { prompt: LessonPhrase; options: LessonPhrase[]; answerId: string }[];
  readCard?: { imageUrl: string; questions: { prompt: LessonPhrase; options: LessonPhrase[]; answerId: string }[] };
};

export type NounDef = { key: string; label: string; gloss?: string };
export type VerbDef = { key: string; label: string; gloss?: string };

export function buildManifest(opts: {
  id: string;
  nouns: NounDef[];
  verbs: VerbDef[];
  sentence: (noun: string, verb: string) => string;
  phraseId: (lesson: string, combo: string) => string;
  audioUrl: (combo: string) => string;
  // Extra voices: { voice: "alvaro", audioUrl: (combo) => ... }. The
  // default voice keeps the legacy audioUrl; each entry adds a choice.
  audioVoices?: { voice: string; audioUrl: (combo: string) => string }[];
  imageUrl: (combo: string) => string;
  // Tap-to-hear words for each phrase, composed from the same atoms
  // as the sentence so glosses are correct by construction.
  wordsFor?: (noun: NounDef, verb: VerbDef, phraseId: string, text: string) => PhraseWord[] | undefined;
}): LessonManifest {
  const lesson = opts.id.replace(/^([a-z]{2}-)?lesson-/, "");
  const phrases = opts.nouns.flatMap((noun) =>
    opts.verbs.map((verb) => {
      const combo = `${noun.key}-${verb.key}`;
      const audioUrls = opts.audioVoices?.length
        ? Object.fromEntries(opts.audioVoices.map((v) => [v.voice, v.audioUrl(combo)]))
        : undefined;
      const id = opts.phraseId(lesson, combo);
      const text = opts.sentence(noun.label, verb.label);
      const words = opts.wordsFor?.(noun, verb, id, text);
      return {
        id,
        text,
        audioUrl: opts.audioUrl(combo),
        ...(audioUrls ? { audioUrls } : {}),
        imageUrl: opts.imageUrl(combo),
        ...(words?.length ? { words } : {}),
      };
    }),
  );
  return {
    id: opts.id,
    phrases,
    activities: ["listen-match", "image-phrase", "speak-score", "read-write"],
  };
}


