import { useCallback, useEffect, useState } from 'react';
import { LEVELS } from './levels';
import { CHAPTERS } from './chapters';
import { CARS } from './cars';
import { clearAllDrafts } from './drafts';

export interface Cosmetics {
  color: string;
  body: string;
  stripe: string;
  sticker: string;
  trail: string;
}

export interface LevelRecord {
  stars: number;
  bestCoins: number;
  perfect?: boolean;
}

export interface Progress {
  name: string;
  welcomed?: boolean;
  xp: number;
  coins: number;
  totalCoinsEarned: number;
  levels: Record<number, LevelRecord>;
  owned: string[];
  cosmetics: Cosmetics;
  badges: string[];
  streak: number;
  lastPlayed: string; // yyyy-mm-dd
  sound: boolean;
  codeMode: boolean; // prefers typing code over blocks
  codeWins: number;
  codeLevels: number[]; // different levels won by typing code
  seenChapters: number[];
  chaptersPaid: number[];
}

const KEY = 'turbo-coder-v2';

export const DEFAULT_PROGRESS: Progress = {
  name: '',
  xp: 0,
  coins: 0,
  totalCoinsEarned: 0,
  levels: {},
  owned: ['color:auto', 'color:#ff3b4a', 'color:#2f7bff', 'body:auto', 'body:classic', 'stripe:none', 'sticker:none', 'trail:💨'],
  // 'auto' body = each level's own car; 'auto' color = that car's own paint
  cosmetics: { color: 'auto', body: 'auto', stripe: 'none', sticker: 'none', trail: '💨' },
  badges: [],
  streak: 0,
  lastPlayed: '',
  sound: true,
  codeMode: false,
  codeWins: 0,
  codeLevels: [],
  seenChapters: [],
  chaptersPaid: [],
};

export const RANKS = ['Rookie', 'Driver', 'Racer', 'Speedster', 'Hotshot', 'Pro', 'Ace', 'Legend', 'Hero', 'Master', 'Champion', 'Turbo God'];
export const XP_PER_LEVEL = 200;

export function levelFromXp(xp: number) {
  const lvl = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    level: lvl,
    rank: RANKS[Math.min(Math.floor((lvl - 1) / 4), RANKS.length - 1)],
    into: xp % XP_PER_LEVEL,
    next: XP_PER_LEVEL,
  };
}

/** Stars: 1 for finishing, 2 for a decent solution, 3 for par or better AND using the new idea. */
export function starsFor(used: number, par: number, conceptUsed: boolean) {
  if (used <= par && conceptUsed) return 3;
  if (used <= Math.ceil(par * 1.5) + 1) return 2;
  return 1;
}

export const PERFECT_XP = 50;
export const PERFECT_COINS = 10;
export const CHAPTER_XP = 100;
export const CHAPTER_COINS = 30;

export interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  test: (p: Progress) => boolean;
}

const done = (p: Progress, id: number) => (p.levels[id]?.stars ?? 0) > 0;
const count = (p: Progress, f: (r: LevelRecord) => boolean) => Object.values(p.levels).filter(f).length;
const chapterDone = (p: Progress, ch: number) => LEVELS.filter((l) => l.chapter === ch).every((l) => done(p, l.id));

export const BADGES: Badge[] = [
  { id: 'first', icon: '🏁', title: 'First Finish', desc: 'Finish your first track', test: (p) => count(p, (r) => r.stars > 0) >= 1 },
  { id: 'star3', icon: '⭐', title: 'Perfect Lap', desc: 'Get 3 stars on any level', test: (p) => count(p, (r) => r.stars === 3) >= 1 },
  { id: 'perf1', icon: '🎯', title: 'First Try!', desc: 'Win a level on your first try with the fewest blocks', test: (p) => count(p, (r) => !!r.perfect) >= 1 },
  { id: 'perf10', icon: '🏹', title: 'Sharpshooter', desc: 'Get 10 Perfect Runs', test: (p) => count(p, (r) => !!r.perfect) >= 10 },
  { id: 'perf50', icon: '👑', title: 'Flawless King', desc: 'Get 50 Perfect Runs', test: (p) => count(p, (r) => !!r.perfect) >= 50 },
  { id: 'stars50', icon: '🌟', title: 'Star Collector', desc: 'Earn 50 stars', test: (p) => Object.values(p.levels).reduce((n, r) => n + r.stars, 0) >= 50 },
  { id: 'stars200', icon: '✨', title: 'Galaxy of Stars', desc: 'Earn 200 stars', test: (p) => Object.values(p.levels).reduce((n, r) => n + r.stars, 0) >= 200 },
  { id: 'rich', icon: '🪙', title: 'Coin Hoarder', desc: 'Earn 200 coins', test: (p) => p.totalCoinsEarned >= 200 },
  { id: 'coder', icon: '⌨️', title: 'Real Coder', desc: 'Win a level by typing code', test: (p) => p.codeLevels.length >= 1 },
  { id: 'coder20', icon: '💻', title: 'Code Wizard', desc: 'Win 20 different levels by typing code', test: (p) => p.codeLevels.length >= 20 },
  { id: 'streak3', icon: '🔥', title: 'On Fire', desc: 'Play 3 days in a row', test: (p) => p.streak >= 3 },
  { id: 'streak7', icon: '🚀', title: 'Unstoppable', desc: 'Play 7 days in a row', test: (p) => p.streak >= 7 },
  ...CHAPTERS.map((c) => ({
    id: `ch${c.id}`,
    icon: c.emoji,
    title: `${c.name} Hero`,
    desc: `Finish all of ${c.name}`,
    test: (p: Progress) => chapterDone(p, c.id),
  })),
  { id: 'champ', icon: '🏆', title: 'Turbo Champion', desc: 'Finish all 100 levels', test: (p) => LEVELS.every((l) => done(p, l.id)) },
];

export interface ShopItem {
  key: string; // category:value
  cat: keyof Cosmetics;
  value: string;
  label: string;
  cost: number;
}

const colors: [string, string, number][] = [
  ['#ff3b4a', 'Red', 0],
  ['#2f7bff', 'Blue', 0],
  ['#ffcf24', 'Yellow', 10],
  ['#22c55e', 'Green', 10],
  ['#a855f7', 'Purple', 15],
  ['#ff7a1a', 'Orange', 15],
  ['#ff5fb0', 'Pink', 20],
  ['#17d4d4', 'Teal', 20],
  ['#f5f5f5', 'Ghost White', 30],
  ['#2b2b35', 'Midnight', 30],
  ['#c0c8d8', 'Silver', 40],
  ['#d4a017', 'Gold', 80],
];

const item = (cat: keyof Cosmetics, value: string, label: string, cost: number): ShopItem => ({ key: `${cat}:${value}`, cat, value, label, cost });

export const SHOP: ShopItem[] = [
  item('color', 'auto', "Car's own color", 0),
  ...colors.map(([v, l, c]) => item('color', v, l, c)),
  item('body', 'auto', 'Track car', 0),
  ...CARS.map((car) => item('body', car.id, car.name, car.cost)),
  item('stripe', 'none', 'No stripe', 0),
  item('stripe', 'racing', 'Racing stripes', 15),
  item('stripe', 'flame', 'Flames', 30),
  item('sticker', 'none', 'No sticker', 0),
  item('sticker', '⚡', 'Lightning', 10),
  item('sticker', '🦁', 'Lion', 15),
  item('sticker', '🚀', 'Rocket', 20),
  item('sticker', '🦄', 'Unicorn', 25),
  item('sticker', '🐉', 'Dragon', 30),
  item('trail', '💨', 'Dust', 0),
  item('trail', '✨', 'Sparkles', 20),
  item('trail', '⭐', 'Stars', 30),
  item('trail', '🫧', 'Bubbles', 30),
  item('trail', '🔥', 'Fire', 40),
  item('trail', '🌈', 'Rainbow', 50),
  item('trail', '💖', 'Hearts', 50),
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** The streak still counts only if you played today or yesterday. */
export function liveStreak(p: Progress): number {
  return p.lastPlayed && dayDiff(p.lastPlayed, today()) <= 1 ? p.streak : 0;
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        ...DEFAULT_PROGRESS,
        ...saved,
        owned: [...new Set([...DEFAULT_PROGRESS.owned, ...(saved.owned ?? [])])],
        cosmetics: { ...DEFAULT_PROGRESS.cosmetics, ...saved.cosmetics },
      };
    }
  } catch {
    /* ignore corrupt data */
  }
  return DEFAULT_PROGRESS;
}

export interface WinInfo {
  stars: number;
  coins: number; // coins picked up on the track
  perfect: boolean; // first attempt, par or better, concept used
  codeMode: boolean;
}

export interface WinSummary {
  stars: number;
  xpGained: number;
  coinsGained: number;
  perfectBonus: boolean;
  chapterDone: number | null;
  newBadges: Badge[];
  leveledUp: boolean;
  firstTime: boolean;
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* storage full or blocked (private mode): keep playing without saving */
    }
  }, [progress]);

  /** Works out what a win earns without changing state. */
  const completeLevel = useCallback(
    (levelId: number, win: WinInfo): { next: Progress; summary: WinSummary } => {
      const prev = progress;
      const old = prev.levels[levelId] ?? { stars: 0, bestCoins: 0 };
      const firstTime = old.stars === 0;
      const newStars = Math.max(0, win.stars - old.stars);
      const newCoins = Math.max(0, win.coins - old.bestCoins);
      const perfectBonus = win.perfect && !old.perfect;

      let xpGained = (firstTime ? 50 : 0) + newStars * 20 + newCoins * 5 + (perfectBonus ? PERFECT_XP : 0);
      let coinsGained = newCoins * 3 + (firstTime ? 5 : 0) + (perfectBonus ? PERFECT_COINS : 0);

      let streak = prev.streak;
      const t = today();
      if (prev.lastPlayed !== t) streak = prev.lastPlayed && dayDiff(prev.lastPlayed, t) === 1 ? prev.streak + 1 : 1;

      const next: Progress = {
        ...prev,
        streak,
        lastPlayed: t,
        codeWins: prev.codeWins + (win.codeMode ? 1 : 0),
        codeLevels: win.codeMode && !prev.codeLevels.includes(levelId) ? [...prev.codeLevels, levelId] : prev.codeLevels,
        levels: {
          ...prev.levels,
          [levelId]: {
            stars: Math.max(old.stars, win.stars),
            bestCoins: Math.max(old.bestCoins, win.coins),
            perfect: old.perfect || perfectBonus,
          },
        },
      };

      const ch = LEVELS[levelId - 1].chapter;
      let chapterDoneNow: number | null = null;
      if (!prev.chaptersPaid.includes(ch) && chapterDone(next, ch)) {
        chapterDoneNow = ch;
        next.chaptersPaid = [...prev.chaptersPaid, ch];
        xpGained += CHAPTER_XP;
        coinsGained += CHAPTER_COINS;
      }

      next.xp = prev.xp + xpGained;
      next.coins = prev.coins + coinsGained;
      next.totalCoinsEarned = prev.totalCoinsEarned + coinsGained;

      const newBadges = BADGES.filter((b) => !next.badges.includes(b.id) && b.test(next));
      next.badges = [...next.badges, ...newBadges.map((b) => b.id)];

      return {
        next,
        summary: {
          stars: win.stars,
          xpGained,
          coinsGained,
          perfectBonus,
          chapterDone: chapterDoneNow,
          newBadges,
          leveledUp: levelFromXp(next.xp).level > levelFromXp(prev.xp).level,
          firstTime,
        },
      };
    },
    [progress],
  );

  const buy = useCallback((it: ShopItem) => {
    setProgress((p) => (p.owned.includes(it.key) || p.coins < it.cost ? p : { ...p, coins: p.coins - it.cost, owned: [...p.owned, it.key] }));
  }, []);

  const equip = useCallback((it: ShopItem) => {
    setProgress((p) => (p.owned.includes(it.key) ? { ...p, cosmetics: { ...p.cosmetics, [it.cat]: it.value } } : p));
  }, []);

  const reset = useCallback(() => {
    clearAllDrafts();
    setProgress({ ...DEFAULT_PROGRESS });
  }, []);

  return { progress, setProgress, completeLevel, buy, equip, reset };
}
