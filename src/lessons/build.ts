export type LessonPhrase = {
  id: string;
  text: string;
  // Native-script scoring reference for vocal-only languages (display
  // text is romanized). Absent for en/es/de/fr, where text scores.
  scoreText?: string;
  audioUrl: string;
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
  imageUrl: (combo: string) => string;
}): LessonManifest {
  const lesson = opts.id.replace(/^([a-z]{2}-)?lesson-/, "");
  const phrases = opts.nouns.flatMap((noun) =>
    opts.verbs.map((verb) => {
      const combo = `${noun.key}-${verb.key}`;
      return {
        id: opts.phraseId(lesson, combo),
        text: opts.sentence(noun.label, verb.label),
        audioUrl: opts.audioUrl(combo),
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


