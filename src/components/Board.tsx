import { useMemo } from 'react';
import type { Level } from '../game/engine';
import type { Cosmetics } from '../game/progress';
import { chapterOf } from '../game/chapters';
import { CarSvg } from './CarSvg';

export interface Puff {
  id: number;
  x: number;
  y: number;
}
export interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Props {
  level: Level;
  cosmetics: Cosmetics;
  car: { x: number; y: number; rot: number };
  taken: Set<string>;
  openGates: Set<string>;
  crashed: boolean;
  speedMs: number;
  puffs: Puff[];
  pops: Pop[];
  bubble: string | null;
  /** what the car is doing, for its animation */
  mood: 'idle' | 'moving' | 'win';
  honking: boolean;
}

export function Board({ level, cosmetics, car, taken, openGates, crashed, speedMs, puffs, pops, bubble, mood, honking }: Props) {
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  const chapter = chapterOf(level.id);

  const scenery = useMemo(
    () =>
      level.grid.map((r, y) =>
        [...r].map((_, x) => ((x * 7 + y * 13 + level.id * 3) % 4 === 0 ? chapter.scenery[(x + y + level.id) % chapter.scenery.length] : '')),
      ),
    [level, chapter],
  );

  const maxCell = Math.min(96, Math.floor(620 / Math.max(cols, rows)));
  const pos = (x: number, y: number) => ({ left: `${((x + 0.5) * 100) / cols}%`, top: `${((y + 0.5) * 100) / rows}%` });

  return (
    <div className="board-wrap">
      <div
        className="board"
        data-world={chapter.world}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}`, maxWidth: `${Math.max(maxCell * cols, 260)}px` }}
      >
        {level.grid.flatMap((r, y) =>
          [...r].map((ch, x) => {
            const road = ch !== '#';
            const key = `${x},${y}`;
            const sign = ch >= '1' && ch <= '9';
            return (
              <div key={key} className={`tile ${road ? 'road' : 'grass'}`}>
                {!road && <span className="scenery">{scenery[y][x]}</span>}
                {road && <i className="dash" />}
                {ch === 'F' && <span className="flag">🏁</span>}
                {ch === 'o' && <span className="flag cone">🚧</span>}
                {ch === 'G' && <span className={`flag gate ${openGates.has(key) ? 'open' : ''}`}>{openGates.has(key) ? '✨' : '🚪'}</span>}
                {sign && <span className="sign">{ch}</span>}
                {ch === 'c' && !taken.has(key) && <span className="coin">🪙</span>}
                {ch === 'S' && <span className="startpad" />}
              </div>
            );
          }),
        )}
        {puffs.map((p) => (
          <span key={p.id} className="puff" style={pos(p.x, p.y)}>
            {cosmetics.trail}
          </span>
        ))}
        {pops.map((p) => (
          <span key={p.id} className="pop" style={pos(p.x, p.y)}>
            {p.text}
          </span>
        ))}
        <div
          className={`car ${crashed ? 'crashed' : mood} ${honking ? 'honking' : ''}`}
          style={{
            width: `${100 / cols}%`,
            height: `${100 / rows}%`,
            left: `${(car.x * 100) / cols}%`,
            top: `${(car.y * 100) / rows}%`,
            transition: `left ${speedMs}ms linear, top ${speedMs}ms linear`,
          }}
        >
          <div className="car-inner" style={{ transform: `rotate(${car.rot}deg)`, transition: `transform ${speedMs}ms ease` }}>
            <CarSvg c={cosmetics} levelId={level.id} moving={mood === 'moving' && !crashed} />
          </div>
          {crashed && <span className="boom">💥</span>}
          {mood === 'win' && <span className="win-burst">🌟</span>}
          {bubble && <span className="bubble">{bubble}</span>}
        </div>
      </div>
    </div>
  );
}
