import { describe, expect, it } from "vitest";
import { buildManifest } from "../src/lessons/build";

const base = {
  id: "xx-lesson-001",
  nouns: [{ key: "wug", label: "Wug" }],
  verbs: [{ key: "zorping", label: "zorping" }],
  sentence: (noun: string, verb: string) => `${noun} ${verb}.`,
  phraseId: (lesson: string, combo: string) => `xx-${lesson}-${combo}`,
  audioUrl: (combo: string) => `/static/lesson-001/audio/xx/${combo}.mp3`,
  imageUrl: (combo: string) => `/static/lesson-001/images/${combo}.jpg`,
};

describe("buildManifest voices", () => {
  it("leaves single-voice phrases with audioUrl only", () => {
    const [phrase] = buildManifest(base).phrases;
    expect(phrase.audioUrl).toBe("/static/lesson-001/audio/xx/wug-zorping.mp3");
    expect(phrase.audioUrls).toBeUndefined();
  });

  it("maps each extra voice per phrase, keeping the default URL", () => {
    const [phrase] = buildManifest({
      ...base,
      audioVoices: [
        { voice: "alvaro", audioUrl: (combo: string) => `/static/lesson-001/audio/xx/alvaro/${combo}.mp3` },
        { voice: "aquila", audioUrl: (combo: string) => `/static/lesson-001/audio/xx/aquila/${combo}.mp3` },
      ],
    }).phrases;
    expect(phrase.audioUrl).toBe("/static/lesson-001/audio/xx/wug-zorping.mp3");
    expect(phrase.audioUrls).toEqual({
      alvaro: "/static/lesson-001/audio/xx/alvaro/wug-zorping.mp3",
      aquila: "/static/lesson-001/audio/xx/aquila/wug-zorping.mp3",
    });
  });
});
