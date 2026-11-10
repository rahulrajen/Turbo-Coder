import type { Feature } from './ast';
import type { Level } from './engine';

/**
 * Most blocks allowed on a level. Fun blocks are free and don't count.
 * - Normal: the best answer plus 20% (at least 3 extra).
 * - Easy: double Normal's extra (so at least 6 extra), for kids who need more room to try things.
 * The "must use" rule applies in both modes, so a long chain of Drive blocks still can't finish a loop level.
 */
export const blockLimit = (level: Level, easy = false) => limit(level.par.blocks, 3, easy);

/** Same idea for typed code (counted in lines / statements), with at least 4 extra lines in Normal and 8 in Easy. */
export const lineLimit = (level: Level, easy = false) => limit(level.par.lines, 4, easy);

const limit = (par: number, least: number, easy: boolean) => par + Math.max(least, Math.ceil(par * 0.2)) * (easy ? 2 : 1);

/**
 * Star bands between the best answer and the limit of the mode being played:
 * the best answer or shorter is ⭐⭐⭐, the top third of the extra room is ⭐, the rest is ⭐⭐.
 * Example: best 5, limit 8 → 5 or less ⭐⭐⭐, 6–7 ⭐⭐, 8 ⭐.
 */
export const starBands = (par: number, max: number) => ({ three: par, two: par + Math.floor(((max - par) * 2) / 3), one: max });

/** The words for each mode, used on the switch and in the guides. */
export const MODES = {
  easy: { icon: '🐣', name: 'Easy', text: 'More blocks allowed, only the main 🎯 block needed, and only 1 test track' },
  normal: { icon: '🏎️', name: 'Normal', text: 'Fewer blocks allowed, every 🎯 block needed, and every test track' },
};

/** How each "must use" idea is named on screen. */
export const MUST_USE: Record<Feature, string> = {
  repeat: '🔁 Repeat',
  while: '🔄 While',
  if: '❓ If',
  let: '📦 Make box',
  function: '🛠️ Function',
  foreach: '📜 For each',
  onsign: '🪧 On sign',
  say: '💬 Say',
  loop: '🔁 any loop (Repeat, While or For each)',
};

export const mustUseText = (use: Feature[]) => use.map((f) => MUST_USE[f]).join(' + ');

/** The three difficulty steps inside every world. */
export const TIERS = {
  warmup: '🟢 Warm-up',
  challenge: '🟡 Challenge',
  expert: '🔴 Expert',
} as const;
