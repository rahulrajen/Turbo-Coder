import { useEffect } from 'react';
import { play } from '../game/sound';
import type { Level } from '../game/engine';
import { CHAPTERS } from '../game/chapters';
import { PERFECT_COINS, PERFECT_XP, REWARDS, type Progress, type WinSummary, levelFromXp } from '../game/progress';

interface Props {
  summary: WinSummary & { tip: string };
  level: Level;
  progress: Progress;
  hasNext: boolean;
  onNext: () => void;
  onMap: () => void;
  onReplay: () => void;
}

const CONFETTI = ['🎉', '⭐', '🎊', '✨', '🏆', '🪙', '🎈', '🚀'];

export function WinModal({ summary, level, progress, hasNext, onNext, onMap, onReplay }: Props) {
  // a "ding" as each star pops in, then the badge / level-up jingles
  useEffect(() => {
    const sfx = progress.sound;
    const timers: number[] = [];
    for (let s = 1; s <= summary.stars; s++) timers.push(window.setTimeout(() => play('star', sfx), 700 + s * 250));
    const after = 900 + summary.stars * 250;
    if (summary.leveledUp) timers.push(window.setTimeout(() => play('levelup', sfx), after));
    if (summary.newBadges.length) timers.push(window.setTimeout(() => play('badge', sfx), after + (summary.leveledUp ? 800 : 0)));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // play once when the prize screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rank = levelFromXp(progress.xp);
  const chapter = summary.chapterDone ? CHAPTERS[summary.chapterDone - 1] : null;
  const pieces = summary.perfectBonus ? 44 : 26;
  return (
    <div className="modal-back">
      <div className="confetti" aria-hidden>
        {Array.from({ length: pieces }, (_, i) => (
          <span key={i} style={{ left: `${(i * 4.3) % 100}%`, animationDelay: `${(i % 8) * 0.15}s`, fontSize: `${18 + (i % 4) * 8}px` }}>
            {CONFETTI[i % CONFETTI.length]}
          </span>
        ))}
      </div>
      <div className={`modal win ${summary.perfectBonus ? 'gold' : ''}`} role="dialog" aria-label="Level complete">
        <h2>{summary.perfectBonus ? '🎯 PERFECT RUN!' : summary.stars === 3 ? 'SUPER! Well done!' : 'Very good! You did it!'}</h2>
        <p className="sub">{level.title} complete</p>
        <div className="stars">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= summary.stars ? 'lit' : ''} style={{ animationDelay: `${s * 0.25}s` }}>
              ★
            </span>
          ))}
        </div>
        {summary.tip && <p className="tip">💡 {summary.tip}</p>}
        {summary.perfectBonus && (
          <div className="perfect-banner">
            ⚡ First GO and 3 stars! <b>+{PERFECT_XP} XP</b> and <b>+{PERFECT_COINS} 🪙</b> bonus
          </div>
        )}
        <div className="rewards">
          <div>
            <b>+{summary.xpGained}</b>
            <span>XP</span>
          </div>
          <div>
            <b>+{summary.coinsGained}</b>
            <span>🪙 coins</span>
          </div>
        </div>
        {(summary.bossBonus || summary.dailyBonus > 0) && (
          <div className="bonus-chips">
            {summary.bossBonus && (
              <span>
                👹 Boss beaten! +{REWARDS.bossXp} XP +{REWARDS.bossCoins} 🪙
              </span>
            )}
            {summary.dailyBonus > 0 && <span>🌞 First win today! +{summary.dailyBonus} 🪙</span>}
          </div>
        )}
        {chapter && (
          <div className="levelup chapter">
            {chapter.emoji} {chapter.name} finished! <b>+{summary.chapterXp} XP, +{summary.chapterCoins} 🪙</b>
          </div>
        )}
        {summary.leveledUp && (
          <div className="levelup">
            ⬆️ LEVEL UP! Now you are a <b>{rank.rank}</b> (Lv {rank.level})
          </div>
        )}
        {summary.newBadges.map((b) => (
          <div key={b.id} className="newbadge">
            <span>{b.icon}</span>
            <div>
              <b>New badge: {b.title}</b>
              <small>{b.desc} · +{REWARDS.badgeCoins} 🪙</small>
            </div>
          </div>
        ))}
        <div className="modal-actions">
          {hasNext && (
            <button className="btn go" onClick={onNext}>
              Next level ▶
            </button>
          )}
          <button className="btn" onClick={onReplay}>
            ↺ Play again
          </button>
          <button className="btn ghost" onClick={onMap}>
            Map
          </button>
        </div>
      </div>
    </div>
  );
}
