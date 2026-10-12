// FAKE stand-in for the public code repo. Same shape as the real
// src/lessons/aliases.ts (content-owned — the merge overlays this file).
// Gibberish pairs exercising the expansion/alias mechanism. See
// specs/content-split.md.
export const TRANSCRIPT_EXPANSIONS: Record<string, string> = {
  wugwug: "wug wug",
};

export const TRANSCRIPT_ALIASES: Record<string, string> = {
  zug: "wug",
  blorg: "blarg",
};
