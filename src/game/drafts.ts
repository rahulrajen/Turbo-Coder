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

export function clearAllDrafts() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('turbo-coder-draft-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
