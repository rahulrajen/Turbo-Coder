// Makes extra versions of a level's track (test tracks) and longer roads for the hard levels.
// Nothing here is trusted blindly: a version is only kept if the level's own model solution
// still wins on it, the road doesn't cross itself, and it fits on the screen.
import type { Block } from './ast';
import type { Level, TestTrack } from './engine';
import { type Part, type RouteSpec, buildGrid } from './route';
import { runBlocks } from './interpret';

export interface TrackSpec {
  route: RouteSpec;
  data: Record<string, unknown>;
  secret?: string;
}

/** Biggest grid we allow, so tracks still fit nicely on a phone. */
const MAX_SIDE = 12;

interface Built {
  grid: string[];
  ok: boolean;
  road: number;
}

function build(t: TrackSpec): Built {
  const b = buildGrid(t.route);
  const keys = b.cells.map((c) => c.join(','));
  const unique = new Set(keys).size === keys.length && !b.cones.some((c) => keys.includes(c.join(',')));
  return { grid: b.grid, ok: unique && b.grid.length <= MAX_SIDE && b.grid[0].length <= MAX_SIDE, road: b.cells.length };
}

const wins = (base: Level, t: TrackSpec, ref: Block[], grid: string[]) =>
  runBlocks({ ...base, grid, startDir: t.route.dir, data: t.data, secret: t.secret }, ref).outcome === 'finish';

const mirror = (parts: Part[]): Part[] => parts.map((p) => (p === 'L' ? 'R' : p === 'R' ? 'L' : p === 'D' ? 'E' : p === 'E' ? 'D' : p));
const stretch = (parts: Part[], k: number): Part[] => parts.map((p) => (typeof p === 'number' ? p + k : p));
const swapSigns = (signs: Record<number, number>) => Object.fromEntries(Object.entries(signs).map(([i, d]) => [i, d === 1 ? 2 : d === 2 ? 1 : d]));

/** Makes every "how far" number in the given data k bigger (list items, stop.n for drive steps, car.fuel …). */
function bumpData(data: Record<string, unknown>, k: number): Record<string, unknown> {
  const bump = (v: unknown): unknown => {
    if (typeof v === 'number') return v + k;
    if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? bumpObj(x as Record<string, unknown>) : bump(x)));
    if (v && typeof v === 'object') return bumpObj(v as Record<string, unknown>);
    return v;
  };
  // an entry like { c: 'R', n: 1 } is a turn, not a distance, so it stays as it is
  const bumpObj = (o: Record<string, unknown>) => ('c' in o && o.c !== 'F' ? o : Object.fromEntries(Object.entries(o).map(([key, x]) => [key, typeof x === 'number' ? x + k : x])));
  return Object.fromEntries(Object.entries(data).map(([key, v]) => [key, bump(v)]));
}

const WORDS = ['zoom', 'nova', 'star', 'moon', 'rocket', 'comet', 'super'];

/** A new password: if the given words join up to the secret, swap them for parts of a new word. */
function newSecret(t: TrackSpec): TrackSpec | null {
  if (!t.secret) return null;
  const leaves: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') leaves.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  Object.values(t.data).forEach(walk);
  if (leaves.length === 0 || leaves.join('') !== t.secret) return null;
  const word = WORDS.find((w) => w !== t.secret && w.length >= leaves.length) ?? 'zoom';
  // split the new word into as many pieces as there were
  const size = Math.ceil(word.length / leaves.length);
  const pieces = leaves.map((_, i) => word.slice(i * size, i === leaves.length - 1 ? undefined : (i + 1) * size));
  let n = 0;
  const swap = (v: unknown): unknown => (typeof v === 'string' ? pieces[n++] : Array.isArray(v) ? v.map(swap) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v);
  return { ...t, data: swap(t.data) as Record<string, unknown>, secret: word };
}

/** Ideas for other versions of a track, best ones first. */
function candidates(t: TrackSpec): TrackSpec[] {
  const out: TrackSpec[] = [];
  const r = t.route;
  const pinned = Object.keys(r.signs ?? {}).length > 0 || (r.gates ?? []).length > 0; // signs and gates sit at fixed spots on the road
  const m: TrackSpec = { ...t, route: { ...r, parts: mirror(r.parts) } };
  if (!pinned) {
    out.push({ ...m, route: { ...m.route, parts: stretch(m.route.parts, 1) }, data: bumpData(t.data, 1) });
    out.push({ ...t, route: { ...r, parts: stretch(r.parts, 1) }, data: bumpData(t.data, 1) });
  }
  out.push(m);
  if (r.signs) out.push({ ...m, route: { ...m.route, signs: swapSigns(r.signs) } });
  if (!pinned && Object.keys(t.data).length === 0) {
    out.push({ ...t, route: { ...r, parts: [...r.parts, 'R', 2, 'L', 2] } });
    out.push({ ...t, route: { ...r, parts: [...r.parts, 'L', 2, 'R', 2] } });
  }
  const s = newSecret(t);
  if (s) out.push(s, { ...s, route: { ...s.route, parts: mirror(r.parts) } });
  return out;
}

const signature = (grid: string[], t: TrackSpec) => grid.join('|') + JSON.stringify(t.data) + (t.secret ?? '');

/** Up to `max` test tracks on which the model solution also wins (and that differ from the main track). */
export function makeTests(base: Level, main: TrackSpec, mainGrid: string[], ref: Block[], max = 2): TestTrack[] {
  const seen = new Set([signature(mainGrid, main)]);
  const tests: TestTrack[] = [];
  for (const c of candidates(main)) {
    const b = build(c);
    if (!b.ok || seen.has(signature(b.grid, c)) || !wins(base, c, ref, b.grid)) continue;
    seen.add(signature(b.grid, c));
    tests.push({ grid: b.grid, startDir: c.route.dir, data: c.data, secret: c.secret });
    if (tests.length >= max) break;
  }
  return tests;
}

/**
 * A longer, twistier main road for expert levels. Only for tracks with no given data, signs or gates
 * (their story and numbers are written for the original road). Returns null if nothing works.
 */
export function grow(base: Level, main: TrackSpec, mainRoad: number, ref: Block[]): { spec: TrackSpec; grid: string[] } | null {
  const r = main.route;
  if (Object.keys(main.data).length || Object.keys(r.signs ?? {}).length || (r.gates ?? []).length) return null;
  const options: Part[][] = [
    [...stretch(r.parts, 1), 'R', 2, 'L', 3],
    [...stretch(r.parts, 1), 'L', 2, 'R', 3],
    stretch(r.parts, 2),
    [...r.parts, 'R', 2, 'L', 3],
    [...r.parts, 'L', 2, 'R', 3],
    stretch(r.parts, 1),
  ];
  for (const parts of options) {
    const spec: TrackSpec = { ...main, route: { ...r, parts } };
    const b = build(spec);
    if (b.ok && b.road >= mainRoad * 1.3 && wins(base, spec, ref, b.grid)) return { spec, grid: b.grid };
  }
  return null;
}
