// Shared lesson-flow logic: imported by tests and by the browser player.
// Zero dependencies, no Node or DOM APIs.

export function shuffled(items, random) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Split phrases into rounds of questions. Each question has a target plus
// `options` distinct options including the target. Targets cycle through
// every phrase exactly once when rounds*perRound == phrases.length.
export function buildQuestions(
  phrases,
  { rounds = 4, perRound = 2, optionCount = 4, random = Math.random } = {},
) {
  const targets = shuffled(phrases, random);
  const out = [];
  let i = 0;
  for (let r = 0; r < rounds; r++) {
    const round = [];
    for (let q = 0; q < perRound; q++) {
      const target = targets[i % targets.length];
      i++;
      const distractors = shuffled(
        phrases.filter((p) => p.id !== target.id),
        random,
      ).slice(0, optionCount - 1);
      round.push({
        target,
        options: shuffled([target, ...distractors], random),
      });
    }
    out.push(round);
  }
  return out;
}

export function checkAnswer(question, choiceId) {
  return question.target.id === choiceId;
}

// One phrase per noun, verbs alternating. Groups by the noun/verb keys in
// the phrase id (NNN-noun-verb, optionally lang-prefixed), never by word
// position: elided articles and split verbs have no stable 2nd/final-word
// slots across languages.
export function buildSpeakPlan(phrases) {
  const keysOf = (p) => {
    const parts = p.id.split("-");
    if (parts.length > 3) parts.shift();
    const [, noun, verb] = parts;
    return { noun, verb };
  };
  const nounOf = (p) => keysOf(p).noun;
  const verbOf = (p) => keysOf(p).verb;
  const nouns = [...new Set(phrases.map(nounOf))];
  const verbs = [...new Set(phrases.map(verbOf))];
  return nouns.map((noun, i) => {
    const verb = verbs[i % verbs.length];
    return phrases.find((p) => nounOf(p) === noun && verbOf(p) === verb).id;
  });
}

export function langFromPath(pathname) {
  const match = pathname.match(/^\/lesson\/([a-z]{2})\/\d{2,3}$/);
  return match ? match[1] : "en";
}

export function lessonFromPath(pathname) {
  const match = pathname.match(/^\/lesson\/(?:[a-z]{2}\/)?(\d{2,3})$/);
  return match ? match[1] : "01";
}

// Two fixed spread picks: different nouns, different verbs.
export function readWritePicks(phrases) {
  return [phrases[2].id, phrases[5].id];
}

export function blanked(text) {
  const words = text.replace(/\.$/, "").split(" ");
  const answer = words[words.length - 1];
  return {
    prompt: [...words.slice(0, -1), "______."].join(" "),
    answer,
    check: (input) => input.trim().toLowerCase() === answer.toLowerCase(),
  };
}

export function nextIncomplete(activities, completed) {
  return activities.find((a) => !completed.includes(a)) ?? null;
}
