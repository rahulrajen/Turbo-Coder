import { useCallback, useEffect, useState } from 'react';
import { LEVELS, OLD_TO_NEW } from './levels';
import { CHAPTERS } from './chapters';
import { CARS } from './cars';
import { clearAllDrafts, moveDrafts } from './drafts';

export interface Cosmetics {
  color: string; // a hex color, 'auto' (the car's own paint) or 'grad:<name>' (special paint)
  body: string;
  pattern: string;
  stripe: string;
  sticker: string;
  topper: string;
  wheels: string;
  glow: string;
  trail: string;
  horn: string;
}

export interface LevelRecord {
  stars: number;
  bestCoins: number;
  perfect?: boolean;
}

export interface Progress {
  name: string;
  welcomed?: boolean;
  /** 2 = worlds of 30/20 levels (250 total). Older saves used 10 levels per world. */
  layout?: number;
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

const DEFAULT_COSMETICS: Cosmetics = {
  color: 'auto',
  body: 'auto',
  pattern: 'none',
  stripe: 'none',
  sticker: 'none',
  topper: 'none',
  wheels: 'black',
  glow: 'none',
  trail: '💨',
  horn: 'beep',
};

export const DEFAULT_PROGRESS: Progress = {
  name: '',
  layout: 2,
  xp: 0,
  coins: 0,
  totalCoinsEarned: 0,
  levels: {},
  owned: Object.entries(DEFAULT_COSMETICS).map(([k, v]) => `${k}:${v}`).concat(['color:#ff3b4a', 'color:#2f7bff', 'body:classic']),
  // 'auto' body = each level's own car; 'auto' color = that car's own paint
  cosmetics: DEFAULT_COSMETICS,
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

// ---------- XP and driver levels ----------

export const RANKS = ['Rookie', 'Learner', 'Driver', 'Racer', 'Speedster', 'Hotshot', 'Pro', 'Ace', 'Star', 'Legend', 'Hero', 'Master', 'Grandmaster', 'Champion', 'Turbo God'];

/** XP needed to go from driver level n to n + 1: starts small and grows, so early levels come quickly. */
const xpToNext = (n: number) => 100 + 15 * (n - 1);

export function levelFromXp(xp: number) {
  let level = 1;
  let left = xp;
  while (left >= xpToNext(level)) {
    left -= xpToNext(level);
    level++;
  }
  return { level, rank: RANKS[Math.min(Math.floor((level - 1) / 4), RANKS.length - 1)], into: left, next: xpToNext(level) };
}

/** Stars: 1 for finishing, 2 for a decent solution, 3 for par or better AND using the new idea. */
export function starsFor(used: number, par: number, conceptUsed: boolean) {
  if (used <= par && conceptUsed) return 3;
  if (used <= Math.ceil(par * 1.5) + 1) return 2;
  return 1;
}

// ---------- rewards (all in one place so they are easy to tune) ----------

export const REWARDS = {
  firstWinXp: 40,
  starXp: 15,
  trackCoinXp: 5,
  firstWinCoins: 5,
  trackCoinCoins: 3,
  perfectXp: 40,
  perfectCoins: 10,
  bossXp: 30,
  bossCoins: 15,
  badgeCoins: 15,
  /** first win of each day: base + a bit more for every day of the streak */
  dailyCoins: (streak: number) => 10 + 5 * Math.min(Math.max(streak - 1, 0), 4),
  /** finishing every level in a world: the long early worlds and the harder later ones pay the same */
  worldXp: (_size: number) => 150,
  worldCoins: (_size: number) => 60,
};
export const PERFECT_XP = REWARDS.perfectXp;
export const PERFECT_COINS = REWARDS.perfectCoins;

// ---------- badges ----------

export interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  test: (p: Progress) => boolean;
}

const done = (p: Progress, id: number) => (p.levels[id]?.stars ?? 0) > 0;
const count = (p: Progress, f: (r: LevelRecord) => boolean) => Object.values(p.levels).filter(f).length;
const starsOf = (p: Progress) => Object.values(p.levels).reduce((n, r) => n + r.stars, 0);
const chapterDone = (p: Progress, ch: number) => LEVELS.filter((l) => l.chapter === ch).every((l) => done(p, l.id));
const carsOwned = (p: Progress) => p.owned.filter((k) => k.startsWith('body:') && k !== 'body:auto').length;

export const BADGES: Badge[] = [
  { id: 'first', icon: '🏁', title: 'First Finish', desc: 'Finish your first track', test: (p) => count(p, (r) => r.stars > 0) >= 1 },
  { id: 'done25', icon: '🚦', title: 'Warming Up', desc: 'Finish 25 levels', test: (p) => count(p, (r) => r.stars > 0) >= 25 },
  { id: 'done50', icon: '🛣️', title: 'Road Tripper', desc: 'Finish 50 levels', test: (p) => count(p, (r) => r.stars > 0) >= 50 },
  { id: 'done100', icon: '💯', title: 'Century Racer', desc: 'Finish 100 levels', test: (p) => count(p, (r) => r.stars > 0) >= 100 },
  { id: 'done200', icon: '🗺️', title: 'World Traveller', desc: 'Finish 200 levels', test: (p) => count(p, (r) => r.stars > 0) >= 200 },
  { id: 'star3', icon: '⭐', title: 'Perfect Lap', desc: 'Get 3 stars on any level', test: (p) => count(p, (r) => r.stars === 3) >= 1 },
  { id: 'stars50', icon: '🌟', title: 'Star Collector', desc: 'Earn 50 stars', test: (p) => starsOf(p) >= 50 },
  { id: 'stars200', icon: '✨', title: 'Galaxy of Stars', desc: 'Earn 200 stars', test: (p) => starsOf(p) >= 200 },
  { id: 'stars500', icon: '🌌', title: 'Star Legend', desc: 'Earn 500 stars', test: (p) => starsOf(p) >= 500 },
  { id: 'perf1', icon: '🎯', title: 'First Try!', desc: 'Win a level on your first try with the fewest blocks', test: (p) => count(p, (r) => !!r.perfect) >= 1 },
  { id: 'perf10', icon: '🏹', title: 'Sharpshooter', desc: 'Get 10 Perfect Runs', test: (p) => count(p, (r) => !!r.perfect) >= 10 },
  { id: 'perf50', icon: '👑', title: 'Flawless King', desc: 'Get 50 Perfect Runs', test: (p) => count(p, (r) => !!r.perfect) >= 50 },
  { id: 'perf150', icon: '💎', title: 'Diamond Driver', desc: 'Get 150 Perfect Runs', test: (p) => count(p, (r) => !!r.perfect) >= 150 },
  { id: 'rich', icon: '🪙', title: 'Coin Hoarder', desc: 'Earn 200 coins', test: (p) => p.totalCoinsEarned >= 200 },
  { id: 'rich1000', icon: '💰', title: 'Treasure Chest', desc: 'Earn 1,000 coins', test: (p) => p.totalCoinsEarned >= 1000 },
  { id: 'rich3000', icon: '🏦', title: 'Coin Tycoon', desc: 'Earn 3,000 coins', test: (p) => p.totalCoinsEarned >= 3000 },
  { id: 'cars5', icon: '🚗', title: 'Car Collector', desc: 'Own 5 cars', test: (p) => carsOwned(p) >= 5 },
  { id: 'cars16', icon: '🏎️', title: 'Full Garage', desc: 'Own every car', test: (p) => carsOwned(p) >= CARS.length },
  { id: 'coder', icon: '⌨️', title: 'Real Coder', desc: 'Win a level by typing code', test: (p) => p.codeLevels.length >= 1 },
  { id: 'coder20', icon: '💻', title: 'Code Wizard', desc: 'Win 20 different levels by typing code', test: (p) => p.codeLevels.length >= 20 },
  { id: 'coder75', icon: '🧙', title: 'Code Master', desc: 'Win 75 different levels by typing code', test: (p) => p.codeLevels.length >= 75 },
  { id: 'streak3', icon: '🔥', title: 'On Fire', desc: 'Play 3 days in a row', test: (p) => p.streak >= 3 },
  { id: 'streak7', icon: '🚀', title: 'Unstoppable', desc: 'Play 7 days in a row', test: (p) => p.streak >= 7 },
  { id: 'streak14', icon: '☄️', title: 'Super Streak', desc: 'Play 14 days in a row', test: (p) => p.streak >= 14 },
  ...CHAPTERS.map((c) => ({
    id: `ch${c.id}`,
    icon: c.emoji,
    title: `${c.name} Hero`,
    desc: `Finish all of ${c.name}`,
    test: (p: Progress) => chapterDone(p, c.id),
  })),
  { id: 'champ', icon: '🏆', title: 'Turbo Champion', desc: `Finish all ${LEVELS.length} levels`, test: (p) => LEVELS.every((l) => done(p, l.id)) },
];

// ---------- the garage shop ----------

export interface ShopItem {
  key: string; // category:value
  cat: keyof Cosmetics;
  value: string;
  label: string;
  cost: number;
}

const item = (cat: keyof Cosmetics, value: string, label: string, cost: number): ShopItem => ({ key: `${cat}:${value}`, cat, value, label, cost });

/** Special paints drawn as gradients. */
export const GRADIENTS: Record<string, string[]> = {
  sunset: ['#ff5f6d', '#ffc371'],
  ocean: ['#2193b0', '#6dd5ed'],
  lava: ['#f12711', '#f5af19'],
  galaxy: ['#4b1d95', '#c026d3', '#1e3a8a'],
  chrome: ['#f8fafc', '#94a3b8', '#e2e8f0', '#64748b'],
  rainbow: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
};

export const SHOP: ShopItem[] = [
  item('body', 'auto', 'Track car', 0),
  ...CARS.map((car) => item('body', car.id, car.name, car.cost)),

  item('color', 'auto', "Car's own color", 0),
  ...(
    [
      ['#ff3b4a', 'Red', 0],
      ['#2f7bff', 'Blue', 0],
      ['#ffcf24', 'Yellow', 10],
      ['#22c55e', 'Green', 10],
      ['#a855f7', 'Purple', 15],
      ['#ff7a1a', 'Orange', 15],
      ['#ff5fb0', 'Pink', 20],
      ['#17d4d4', 'Teal', 20],
      ['#84cc16', 'Lime', 25],
      ['#8b5cf6', 'Violet', 25],
      ['#f5f5f5', 'Ghost White', 30],
      ['#2b2b35', 'Midnight', 30],
      ['#c0c8d8', 'Silver', 40],
      ['#d4a017', 'Gold', 80],
    ] as [string, string, number][]
  ).map(([v, l, c]) => item('color', v, l, c)),
  item('color', 'grad:sunset', 'Sunset', 150),
  item('color', 'grad:ocean', 'Ocean', 150),
  item('color', 'grad:lava', 'Lava', 200),
  item('color', 'grad:galaxy', 'Galaxy', 200),
  item('color', 'grad:chrome', 'Chrome', 300),
  item('color', 'grad:rainbow', 'Rainbow', 350),

  item('pattern', 'none', 'Plain', 0),
  item('pattern', 'dots', 'Polka dots', 40),
  item('pattern', 'zebra', 'Zebra', 60),
  item('pattern', 'checker', 'Checkers', 60),
  item('pattern', 'stars', 'Stars', 80),
  item('pattern', 'camo', 'Camo', 80),
  item('pattern', 'hearts', 'Hearts', 80),
  item('pattern', 'bolts', 'Lightning', 100),

  item('stripe', 'none', 'No stripe', 0),
  item('stripe', 'racing', 'Racing stripes', 15),
  item('stripe', 'flame', 'Flames', 30),

  item('sticker', 'none', 'No sticker', 0),
  item('sticker', '⚡', 'Lightning', 10),
  item('sticker', '🐱', 'Kitty', 15),
  item('sticker', '🐶', 'Puppy', 15),
  item('sticker', '🦁', 'Lion', 15),
  item('sticker', '⚽', 'Football', 20),
  item('sticker', '🚀', 'Rocket', 20),
  item('sticker', '🍕', 'Pizza', 25),
  item('sticker', '🦄', 'Unicorn', 25),
  item('sticker', '🌈', 'Rainbow', 30),
  item('sticker', '🐉', 'Dragon', 30),
  item('sticker', '🦖', 'Dino', 40),

  item('topper', 'none', 'Nothing on top', 0),
  item('topper', '🎈', 'Balloon', 60),
  item('topper', '⭐', 'Star', 80),
  item('topper', '🎩', 'Top hat', 100),
  item('topper', '🦈', 'Shark fin', 120),
  item('topper', '🦄', 'Unicorn horn', 120),
  item('topper', '👑', 'Crown', 150),
  item('topper', '🛸', 'UFO', 150),

  item('wheels', 'black', 'Black tyres', 0),
  item('wheels', 'white', 'White walls', 30),
  item('wheels', 'neon', 'Neon green', 100),
  item('wheels', 'gold', 'Gold rims', 120),
  item('wheels', 'flame', 'Flame rims', 150),
  item('wheels', 'rainbow', 'Rainbow rims', 200),

  item('glow', 'none', 'No glow', 0),
  item('glow', '#38bdf8', 'Blue glow', 80),
  item('glow', '#f472b6', 'Pink glow', 80),
  item('glow', '#4ade80', 'Green glow', 80),
  item('glow', '#facc15', 'Gold glow', 150),
  item('glow', 'rainbow', 'Rainbow glow', 300),

  item('trail', '💨', 'Dust', 0),
  item('trail', '✨', 'Sparkles', 20),
  item('trail', '⭐', 'Stars', 30),
  item('trail', '🫧', 'Bubbles', 30),
  item('trail', '🍀', 'Clovers', 40),
  item('trail', '🔥', 'Fire', 40),
  item('trail', '🌈', 'Rainbow', 50),
  item('trail', '💖', 'Hearts', 50),
  item('trail', '❄️', 'Snowflakes', 60),
  item('trail', '🎵', 'Music notes', 60),
  item('trail', '🪙', 'Coins', 100),

  item('horn', 'beep', 'Beep beep', 0),
  item('horn', 'duck', 'Duck quack', 60),
  item('horn', 'trumpet', 'Trumpet', 80),
  item('horn', 'cow', 'Cow moo', 100),
  item('horn', 'laser', 'Space laser', 120),
  item('horn', 'train', 'Choo-choo', 120),
];

// ---------- dates ----------

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/**
 * The level to suggest next: the first unfinished one after the furthest level you've finished,
 * so returning players aren't sent back to the new easy levels at the very start.
 */
export function suggestedNext(p: Progress) {
  const furthest = Math.max(0, ...Object.entries(p.levels).filter(([, r]) => r.stars > 0).map(([id]) => Number(id)));
  const unfinished = (l: (typeof LEVELS)[number]) => !(p.levels[l.id]?.stars > 0);
  return LEVELS.find((l) => l.id > furthest && unfinished(l)) ?? LEVELS.find(unfinished);
}

/** The streak still counts only if you played today or yesterday. */
export function liveStreak(p: Progress): number {
  return p.lastPlayed && dayDiff(p.lastPlayed, today()) <= 1 ? p.streak : 0;
}

// ---------- loading (and moving old saves to the 250-level layout) ----------

const DRAFTS_MOVED = 'turbo-coder-drafts-layout';
// badges that meant "finished a whole world / everything" back when worlds had 10 levels
const WORLD_BADGES = new Set([...CHAPTERS.map((c) => `ch${c.id}`), 'champ']);

function migrate(saved: Progress): Progress {
  if (saved.layout === 2) return saved;
  const mapId = (id: number) => OLD_TO_NEW[id] ?? id;
  const levels: Record<number, LevelRecord> = {};
  for (const [id, rec] of Object.entries(saved.levels ?? {})) levels[mapId(Number(id))] = rec;
  const moved: Progress = {
    ...saved,
    layout: 2,
    levels,
    codeLevels: (saved.codeLevels ?? []).map(mapId),
    // worlds are bigger now, so finishing one pays out (and earns its badge) again
    chaptersPaid: [],
    badges: (saved.badges ?? []).filter((b) => !WORLD_BADGES.has(b)),
  };
  try {
    // save the progress first, so a failure below can never leave a half-moved save
    localStorage.setItem(KEY, JSON.stringify(moved));
    // drafts move only once, ever, even if an old copy of the game later saves old-style progress again
    if (localStorage.getItem(DRAFTS_MOVED) !== '2') {
      moveDrafts(mapId);
      localStorage.setItem(DRAFTS_MOVED, '2');
    }
  } catch {
    /* storage full or blocked: keep playing with the moved progress in memory */
  }
  return moved;
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = migrate({ ...JSON.parse(raw) });
      return {
        ...DEFAULT_PROGRESS,
        ...saved,
        owned: [...new Set([...DEFAULT_PROGRESS.owned, ...(saved.owned ?? [])])],
        cosmetics: { ...DEFAULT_COSMETICS, ...saved.cosmetics },
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
  bossBonus: boolean;
  dailyBonus: number; // coins
  chapterDone: number | null;
  chapterXp: number;
  chapterCoins: number;
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
      const R = REWARDS;
      const prev = progress;
      const level = LEVELS[levelId - 1];
      const old = prev.levels[levelId] ?? { stars: 0, bestCoins: 0 };
      const firstTime = old.stars === 0;
      const newStars = Math.max(0, win.stars - old.stars);
      const newCoins = Math.max(0, win.coins - old.bestCoins);
      const perfectBonus = win.perfect && !old.perfect;
      const bossBonus = firstTime && level.boss;

      let xpGained = (firstTime ? R.firstWinXp : 0) + newStars * R.starXp + newCoins * R.trackCoinXp + (perfectBonus ? R.perfectXp : 0) + (bossBonus ? R.bossXp : 0);
      let coinsGained = (firstTime ? R.firstWinCoins : 0) + newCoins * R.trackCoinCoins + (perfectBonus ? R.perfectCoins : 0) + (bossBonus ? R.bossCoins : 0);

      // a streak grows with each new day you win something; the first win of the day pays a bonus
      const t = today();
      const newDay = prev.lastPlayed !== t;
      const streak = newDay ? (prev.lastPlayed && dayDiff(prev.lastPlayed, t) === 1 ? prev.streak + 1 : 1) : prev.streak;
      const dailyBonus = newDay ? R.dailyCoins(streak) : 0;
      coinsGained += dailyBonus;

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

      const ch = level.chapter;
      const size = LEVELS.filter((l) => l.chapter === ch).length;
      let chapterDoneNow: number | null = null;
      let chapterXp = 0;
      let chapterCoins = 0;
      if (!prev.chaptersPaid.includes(ch) && chapterDone(next, ch)) {
        chapterDoneNow = ch;
        next.chaptersPaid = [...prev.chaptersPaid, ch];
        chapterXp = R.worldXp(size);
        chapterCoins = R.worldCoins(size);
        xpGained += chapterXp;
        coinsGained += chapterCoins;
      }

      next.coins = prev.coins + coinsGained;
      next.totalCoinsEarned = prev.totalCoinsEarned + coinsGained;
      const newBadges = BADGES.filter((b) => !next.badges.includes(b.id) && b.test(next));
      next.badges = [...next.badges, ...newBadges.map((b) => b.id)];
      // every new badge comes with a little coin prize
      const badgeCoins = newBadges.length * R.badgeCoins;
      coinsGained += badgeCoins;
      next.coins += badgeCoins;
      next.totalCoinsEarned += badgeCoins;
      next.xp = prev.xp + xpGained;

      return {
        next,
        summary: {
          stars: win.stars,
          xpGained,
          coinsGained,
          perfectBonus,
          bossBonus,
          dailyBonus,
          chapterDone: chapterDoneNow,
          chapterXp,
          chapterCoins,
          newBadges,
          leveledUp: levelFromXp(next.xp).level > levelFromXp(prev.xp).level,
          firstTime,
        },
      };
    },
    [progress],
  );

  const buy = useCallback((it: ShopItem) => {
    setProgress((p) => {
      if (p.owned.includes(it.key) || p.coins < it.cost) return p;
      const next = { ...p, coins: p.coins - it.cost, owned: [...p.owned, it.key] };
      // buying cars can earn the garage badges, which pay their coin prize like any other badge
      const fresh = BADGES.filter((b) => !next.badges.includes(b.id) && b.test(next)).map((b) => b.id);
      if (!fresh.length) return next;
      const prize = fresh.length * REWARDS.badgeCoins;
      return { ...next, badges: [...next.badges, ...fresh], coins: next.coins + prize, totalCoinsEarned: next.totalCoinsEarned + prize };
    });
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
