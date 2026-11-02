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
        <h2>{summary.perfectBonus ? '🎯 PERFECT RUN!' : summary.stars === 3 ? 'AWESOME!' : 'You did it!'}</h2>
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
            ⚡ First try + fewest blocks! <b>+{PERFECT_XP} XP</b> and <b>+{PERFECT_COINS} 🪙</b> bonus
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
            {chapter.emoji} {chapter.name} complete! <b>+{summary.chapterXp} XP, +{summary.chapterCoins} 🪙</b>
          </div>
        )}
        {summary.leveledUp && (
          <div className="levelup">
            ⬆️ LEVEL UP! You are now a <b>{rank.rank}</b> (Lv {rank.level})
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
            ↺ Try for more ⭐
          </button>
          <button className="btn ghost" onClick={onMap}>
            Map
          </button>
        </div>
      </div>
    </div>
  );
}
