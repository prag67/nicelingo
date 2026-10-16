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
};

export type LessonManifest = {
  id: string;
  phrases: LessonPhrase[];
  activities: string[];
};

export type NounDef = { key: string; label: string };
export type VerbDef = { key: string; label: string };

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
}): LessonManifest {
  const lesson = opts.id.replace(/^([a-z]{2}-)?lesson-/, "");
  const phrases = opts.nouns.flatMap((noun) =>
    opts.verbs.map((verb) => {
      const combo = `${noun.key}-${verb.key}`;
      const audioUrls = opts.audioVoices?.length
        ? Object.fromEntries(opts.audioVoices.map((v) => [v.voice, v.audioUrl(combo)]))
        : undefined;
      return {
        id: opts.phraseId(lesson, combo),
        text: opts.sentence(noun.label, verb.label),
        audioUrl: opts.audioUrl(combo),
        ...(audioUrls ? { audioUrls } : {}),
        imageUrl: opts.imageUrl(combo),
      };
    }),
  );
  return {
    id: opts.id,
    phrases,
    activities: ["listen-match", "image-phrase", "speak-score", "read-write"],
  };
}


