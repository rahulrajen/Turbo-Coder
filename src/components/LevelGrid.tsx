import { useState } from 'react';
import { LEVELS } from '../game/levels';
import type { Chapter } from '../game/chapters';
import type { Progress } from '../game/progress';

interface Props {
  chapter: Chapter;
  p: Progress;
  current?: number;
  nextId?: number;
  onPlay: (id: number) => void;
  /** start opened (the world you're playing); others start folded so the map isn't a wall of bubbles */
  defaultOpen?: boolean;
}

/** One world: a banner you can tap to open, plus its level bubbles. */
export function ChapterBlock({ chapter, p, current, nextId, onPlay, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const levels = LEVELS.filter((l) => l.chapter === chapter.id);
  const done = levels.filter((l) => (p.levels[l.id]?.stars ?? 0) > 0).length;
  const stars = levels.reduce((n, l) => n + (p.levels[l.id]?.stars ?? 0), 0);
  const first = levels[0].id;
  const last = levels[levels.length - 1].id;
  return (
    <section className={`chapter ${open ? 'open' : ''}`} data-world={chapter.world}>
      <button className="chapter-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="chapter-emoji">{chapter.emoji}</span>
        <div>
          <h3>
            {chapter.id}. {chapter.name}
          </h3>
          <small>
            {chapter.concept} · levels {first}–{last}
          </small>
        </div>
        <span className="chapter-count">
          {done}/{levels.length} · ⭐ {stars}/{levels.length * 3}
        </span>
        <span className="chapter-toggle">{open ? '▲' : '▼'}</span>
      </button>
      <div className="chapter-bar">
        <i style={{ width: `${(done / levels.length) * 100}%` }} />
      </div>
      {open && (
        <div className="bubbles">
          {levels.map((l, i) => {
            const rec = p.levels[l.id];
            return (
              <button
                key={l.id}
                title={l.title}
                style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
                className={`bubble ${rec?.stars ? 'done' : ''} ${l.id === nextId ? 'next' : ''} ${l.id === current ? 'cur' : ''} ${l.boss ? 'boss' : ''}`}
                onClick={() => onPlay(l.id)}
              >
                <span className="n">{l.boss ? '👹' : l.id}</span>
                <span className="st">{rec?.stars ? '★'.repeat(rec.stars) : '·'}</span>
                {rec?.perfect && <i className="crown">👑</i>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
