import type { Dir } from './engine';

/** number = drive that many squares; L/R = turn; D/E = dodge a cone (right-first / left-first) */
export type Part = number | 'L' | 'R' | 'D' | 'E';

export interface RouteSpec {
  dir: Dir;
  parts: Part[];
  coins?: number[] | 'auto';
  signs?: Record<number, number>;
  gates?: number[];
}

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export interface Built {
  grid: string[];
  cells: [number, number][];
}

/** Turns a list of road parts into a grid. Cell 0 is the start, the last cell is the finish. */
export function buildGrid(spec: RouteSpec): Built {
  let x = 0;
  let y = 0;
  let d = spec.dir;
  const cells: [number, number][] = [[0, 0]];
  const cones: [number, number][] = [];
  const step = (dd: number) => {
    x += DX[dd % 4];
    y += DY[dd % 4];
    cells.push([x, y]);
  };
  for (const p of spec.parts) {
    if (typeof p === 'number') {
      for (let i = 0; i < p; i++) step(d);
    } else if (p === 'L') d = (d + 3) % 4;
    else if (p === 'R') d = (d + 1) % 4;
    else {
      const first = p === 'D' ? (d + 1) % 4 : (d + 3) % 4;
      const second = p === 'D' ? (d + 3) % 4 : (d + 1) % 4;
      cones.push([x + DX[d] * 2, y + DY[d] * 2]);
      step(d);
      step(first);
      step(d);
      step(d);
      step(second);
    }
  }
  const all = [...cells, ...cones];
  const minX = Math.min(...all.map((c) => c[0]));
  const maxX = Math.max(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1]));
  const maxY = Math.max(...all.map((c) => c[1]));
  const grid = Array.from({ length: maxY - minY + 1 }, () => Array.from({ length: maxX - minX + 1 }, () => '#'));
  const put = (c: [number, number], ch: string) => {
    grid[c[1] - minY][c[0] - minX] = ch;
  };
  const last = cells.length - 1;
  const special = new Set<number>([0, last, ...Object.keys(spec.signs ?? {}).map(Number), ...(spec.gates ?? [])]);
  const coins =
    spec.coins === undefined || spec.coins === 'auto'
      ? cells.map((_, i) => i).filter((i) => i >= 2 && i % 3 === 2 && !special.has(i))
      : spec.coins;
  cells.forEach((c) => put(c, '.'));
  coins.forEach((i) => !special.has(i) && put(cells[i], 'c'));
  for (const [i, digit] of Object.entries(spec.signs ?? {})) put(cells[Number(i)], String(digit));
  (spec.gates ?? []).forEach((i) => put(cells[i], 'G'));
  cones.forEach((c) => put(c, 'o'));
  put(cells[0], 'S');
  put(cells[last], 'F');
  return { grid: grid.map((r) => r.join('')), cells };
}
