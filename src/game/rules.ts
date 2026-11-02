import type { Feature } from './ast';
import type { Level } from './engine';

/**
 * Most blocks allowed on a level. Fun blocks are free and don't count.
 * - Normal: the best answer plus about half again (at least 3 extra).
 * - Easy: double the best answer (at least 6 extra), for kids who need more room to try things.
 * The "must use" rule applies in both modes, so a long chain of Drive blocks still can't finish a loop level.
 */
export const blockLimit = (level: Level, easy = false) => limit(level.par.blocks, easy);

/** Same idea for typed code (counted in lines / statements). */
export const lineLimit = (level: Level, easy = false) => (easy ? limit(level.par.lines, true) : level.par.lines + Math.max(4, Math.ceil(level.par.lines * 0.6)));

const limit = (par: number, easy: boolean) => (easy ? Math.max(par * 2, par + 6) : par + Math.max(3, Math.ceil(par * 0.5)));

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
