import { LEVELS } from '../game/levels';
import type { Chapter } from '../game/chapters';
import type { Progress } from '../game/progress';

interface Props {
  chapter: Chapter;
  p: Progress;
  current?: number;
  nextId?: number;
  onPlay: (id: number) => void;
}

/** One world: a banner plus ten level bubbles. */
export function ChapterBlock({ chapter, p, current, nextId, onPlay }: Props) {
  const levels = LEVELS.filter((l) => l.chapter === chapter.id);
  const done = levels.filter((l) => (p.levels[l.id]?.stars ?? 0) > 0).length;
  const stars = levels.reduce((n, l) => n + (p.levels[l.id]?.stars ?? 0), 0);
  return (
    <section className="chapter" data-world={chapter.world}>
      <header className="chapter-head">
        <span className="chapter-emoji">{chapter.emoji}</span>
        <div>
          <h3>
            {chapter.id}. {chapter.name}
          </h3>
          <small>{chapter.concept}</small>
        </div>
        <span className="chapter-count">
          {done}/10 · ⭐ {stars}/30
        </span>
      </header>
      <div className="chapter-bar">
        <i style={{ width: `${done * 10}%` }} />
      </div>
      <div className="bubbles">
        {levels.map((l, i) => {
          const rec = p.levels[l.id];
          return (
            <button
              key={l.id}
              title={l.title}
              style={{ animationDelay: `${i * 40}ms` }}
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
    </section>
  );
}
