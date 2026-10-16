// Unit-completion badges: a unit is done when every lesson in it is
// complete. Tiers reward cumulative units finished (per language on
// the course page, across languages on the picker).
import { UNITS } from "../lessons/curriculum";
import { unitStats } from "./lesson-progress";

export const UNIT_BADGE_TIERS = [
  { units: 1, icon: "🌱" },
  { units: 3, icon: "⭐" },
  { units: 5, icon: "🥉" },
  { units: 10, icon: "🥈" },
  { units: 20, icon: "🥇" },
  { units: 30, icon: "🏅" },
  { units: 40, icon: "🏆" },
  { units: 50, icon: "👑" },
  { units: 60, icon: "💎" },
] as const;

export function completedUnits(
  lang: string,
  progress: Record<string, string[]>,
): number {
  let done = 0;
  for (const u of UNITS) {
    const st = unitStats(lang, u.unit, progress);
    if (st.total > 0 && st.done >= st.total) done++;
  }
  return done;
}

export function badgeFor(unitsDone: number): {
  earned: (typeof UNIT_BADGE_TIERS)[number] | null;
  next: (typeof UNIT_BADGE_TIERS)[number] | null;
} {
  let earned: (typeof UNIT_BADGE_TIERS)[number] | null = null;
  let next: (typeof UNIT_BADGE_TIERS)[number] | null = null;
  for (const tier of UNIT_BADGE_TIERS) {
    if (unitsDone >= tier.units) earned = tier;
    else { next = tier; break; }
  }
  return { earned, next };
}
