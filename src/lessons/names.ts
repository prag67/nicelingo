// FAKE stand-in for the public code repo. Same shape as the real
// src/lessons/names.ts (content-owned — the merge overlays this file).
// Gibberish only. See specs/content-split.md.
import type { Lang } from "./curriculum";

export type LanguageNames = Record<
  Lang,
  { name: string; ownName: string; greeting: string; tileColor: string }
>;

export const NAMES: LanguageNames = {
  en: { name: "English", ownName: "English", greeting: "Hello", tileColor: "#8CC8FF" },
  xx: { name: "Xxian", ownName: "Xxish", greeting: "Xxalo!", tileColor: "#FFB061" },
  yy: { name: "Yyan", ownName: "Yyish", greeting: "Yyalo!", tileColor: "#7FE3C4" },
};
