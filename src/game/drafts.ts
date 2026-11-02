import type { Block } from './ast';

/** Unfinished work and failed-try counts for one level, kept so leaving a level never loses anything. */
export interface Draft {
  blocks?: Block[];
  code?: string;
  codeDirty?: boolean;
  fails?: number;
}

const key = (levelId: number) => `turbo-coder-draft-${levelId}`;

export function loadDraft(levelId: number): Draft {
  try {
    return JSON.parse(localStorage.getItem(key(levelId)) ?? '{}') as Draft;
  } catch {
    return {};
  }
}

export function saveDraft(levelId: number, patch: Draft) {
  try {
    localStorage.setItem(key(levelId), JSON.stringify({ ...loadDraft(levelId), ...patch }));
  } catch {
    /* storage full or blocked */
  }
}

/** Renumbers saved drafts (used once when the level list grew). Reads everything first so nothing is overwritten. */
export function moveDrafts(mapId: (oldId: number) => number) {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('turbo-coder-draft-'));
    const saved = keys.map((k) => [Number(k.slice('turbo-coder-draft-'.length)), localStorage.getItem(k)] as const);
    // write every draft to its new place first, then remove only the old keys nothing was written to
    const written = new Set<string>();
    for (const [id, value] of saved) {
      if (value === null) continue;
      localStorage.setItem(key(mapId(id)), value);
      written.add(key(mapId(id)));
    }
    keys.filter((k) => !written.has(k)).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function clearAllDrafts() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('turbo-coder-draft-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
