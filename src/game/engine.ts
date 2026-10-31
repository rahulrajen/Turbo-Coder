import type { Block, BlockType, Feature } from './ast';

export type Dir = 0 | 1 | 2 | 3; // N E S W

export interface Level {
  id: number;
  chapter: number;
  title: string;
  story: string;
  hint: string;
  /** '#' grass, '.' road, 'S' start, 'F' finish, 'c' coin, 'o' cone, 'G' gate, '1'-'9' sign */
  grid: string[];
  startDir: Dir;
  tools: BlockType[];
  ref: Block[];
  par: { blocks: number; lines: number };
  use: Feature[];
  data: Record<string, unknown>;
  secret?: string;
  starter?: Block[];
  boss: boolean;
}

export type Outcome = 'finish' | 'crash' | 'ended' | 'limit';

export interface Frame {
  x: number;
  y: number;
  rot: number; // cumulative degrees so turning never spins backwards
  event: 'start' | 'move' | 'turn' | 'crash' | 'coin' | 'finish' | 'say' | 'honk' | 'gate';
  key?: string;
  text?: string;
}

export interface RunResult {
  outcome: Outcome;
  frames: Frame[];
  coins: number;
  error?: string;
}

export const MAX_ACTIONS = 600;
export const MAX_STEPS = 30000;
export const MAX_LOOKS = 5000;

/** Secret words match even if a tablet capitalised them or added spaces. */
export const sameWord = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

class Stop extends Error {}

/** `const name = value;` lines the kid's program can use. */
export function dataPrelude(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
    .join('\n');
}

export function createSim(level: Level) {
  const rows = level.grid;
  let x = 0;
  let y = 0;
  rows.forEach((r, ry) => {
    const rx = r.indexOf('S');
    if (rx >= 0) {
      x = rx;
      y = ry;
    }
  });
  let dir: Dir = level.startDir;
  let rot = level.startDir * 90;
  let actions = 0;
  let steps = 0;
  let outcome: Outcome = 'ended';
  let handler: ((n: number) => void) | null = null;
  const taken = new Set<string>();
  const opened = new Set<string>();
  const frames: Frame[] = [{ x, y, rot, event: 'start' }];

  const tile = (tx: number, ty: number) => rows[ty]?.[tx] ?? '#';
  const isRoad = (tx: number, ty: number) => {
    const t = tile(tx, ty);
    if (t === '#' || t === 'o') return false;
    if (t === 'G') return opened.has(`${tx},${ty}`);
    return true;
  };
  const signAt = (tx: number, ty: number) => {
    const t = tile(tx, ty);
    return t >= '1' && t <= '9' ? Number(t) : 0;
  };
  const nd = (d: number) => (d + 4) % 4;
  const ahead = (d: number) => isRoad(x + DX[nd(d)], y + DY[nd(d)]);
  const stop = (o: Outcome): never => {
    outcome = o;
    throw new Stop();
  };
  const guard = () => {
    if (++actions > MAX_ACTIONS) stop('limit');
  };
  // sensor reads get their own, bigger budget so "look a lot, move a little" programs still work
  let looks = 0;
  const look = () => {
    if (++looks > MAX_LOOKS) stop('limit');
  };

  const api = {
    forward() {
      guard();
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      if (!isRoad(nx, ny)) {
        frames.push({ x: nx, y: ny, rot, event: 'crash' });
        stop('crash');
      }
      x = nx;
      y = ny;
      const t = tile(x, y);
      frames.push({ x, y, rot, event: 'move' });
      if (t === 'c' && !taken.has(`${x},${y}`)) {
        taken.add(`${x},${y}`);
        frames.push({ x, y, rot, event: 'coin', key: `${x},${y}` });
      }
      if (t === 'F') {
        frames.push({ x, y, rot, event: 'finish' });
        stop('finish');
      }
      const s = signAt(x, y);
      if (s && handler) handler(s);
    },
    left() {
      guard();
      dir = ((dir + 3) % 4) as Dir;
      rot -= 90;
      frames.push({ x, y, rot, event: 'turn' });
    },
    right() {
      guard();
      dir = ((dir + 1) % 4) as Dir;
      rot += 90;
      frames.push({ x, y, rot, event: 'turn' });
    },
    honk() {
      guard();
      frames.push({ x, y, rot, event: 'honk', text: 'BEEP!' });
    },
    say(what: unknown) {
      guard();
      const text = String(what);
      frames.push({ x, y, rot, event: 'say', text });
      const gx = x + DX[dir];
      const gy = y + DY[dir];
      if (tile(gx, gy) === 'G' && level.secret !== undefined && sameWord(text, level.secret)) {
        opened.add(`${gx},${gy}`);
        frames.push({ x: gx, y: gy, rot, event: 'gate', key: `${gx},${gy}` });
      }
    },
    onSign(fn: (n: number) => void) {
      handler = fn;
    },
    roadAhead: () => (look(), ahead(dir)),
    roadLeft: () => (look(), ahead(dir + 3)),
    roadRight: () => (look(), ahead(dir + 1)),
    atFinish: () => (look(), tile(x, y) === 'F'),
    coinAhead: () => {
      look();
      const cx = x + DX[dir];
      const cy = y + DY[dir];
      return tile(cx, cy) === 'c' && !taken.has(`${cx},${cy}`);
    },
    distanceAhead: () => {
      look();
      let n = 0;
      while (isRoad(x + DX[dir] * (n + 1), y + DY[dir] * (n + 1))) n++;
      return n;
    },
    readSign: () => (look(), signAt(x, y)),
    /** Used by the block interpreter so empty loops cannot hang the page. */
    tick: () => {
      if (++steps > MAX_STEPS) stop('limit');
    },
  };

  const finish = (error?: string): RunResult => ({ outcome, frames, coins: taken.size, error });

  /** Runs `body`, swallowing the internal Stop signal. */
  function run(body: (a: typeof api) => void): RunResult {
    try {
      body(api);
    } catch (e) {
      if (!(e instanceof Stop)) {
        const msg = e instanceof RangeError ? 'A function keeps calling itself without stopping!' : e instanceof Error ? e.message : String(e);
        return finish(msg);
      }
    }
    return finish();
  }

  return { api, run };
}

export function countCoins(level: Level): number {
  return level.grid.join('').split('c').length - 1;
}
