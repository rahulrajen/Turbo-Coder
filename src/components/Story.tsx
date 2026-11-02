import { useState } from 'react';
import { CHAPTERS, type Chapter } from '../game/chapters';
import { type Progress, suggestedNext } from '../game/progress';
import { LEVELS } from '../game/levels';
import { ChapterBlock } from './LevelGrid';

/** Story cutscene for a world, and the "Code Corner" reminder card. */
export function Story({ chapter, intro, onClose }: { chapter: Chapter; intro: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const lines = intro ? chapter.intro : [];
  const showLearn = step >= lines.length;
  const line = lines[step];
  return (
    <div className="modal-back story" data-world={chapter.world}>
      <div className="modal story-card" role="dialog" aria-label={chapter.name}>
        {intro && step === 0 && (
          <div className="world-title">
            <span>{chapter.emoji}</span>
            <h2>Chapter {chapter.id}: {chapter.name}</h2>
          </div>
        )}
        {!showLearn && line ? (
          <>
            <div key={step} className="speech">
              <span className="speaker-face">{line.emoji}</span>
              <div className="speech-bubble">
                <b>{line.who}</b>
                <p>{line.text}</p>
              </div>
            </div>
            <div className="dots">
              {lines.map((_, i) => (
                <i key={i} className={i === step ? 'on' : ''} />
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn go" onClick={() => setStep(step + 1)}>
                Next ▶
              </button>
              <button className="btn ghost" onClick={() => setStep(lines.length)}>
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="learn-title">📘 {chapter.learn.title}</h3>
            <p className="learn-text">{chapter.learn.text}</p>
            <pre className="learn-code">{chapter.learn.code}</pre>
            <div className="modal-actions">
              <button className="btn go" onClick={onClose}>
                {intro ? "Let's go! 🏁" : 'OK, got it!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Jump to any level at any time. */
export function LevelPicker({ progress, current, onPlay, onClose }: { progress: Progress; current: number; onPlay: (id: number) => void; onClose: () => void }) {
  const nextId = suggestedNext(progress)?.id;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal picker" role="dialog" aria-label="Choose a level" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <h2>🗂️ Choose a level</h2>
          <button className="btn ghost small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="picker-body">
          {CHAPTERS.map((c) => (
            <ChapterBlock key={c.id} chapter={c} p={progress} current={current} nextId={nextId} onPlay={onPlay} defaultOpen={c.id === LEVELS[current - 1]?.chapter} />
          ))}
        </div>
      </div>
    </div>
  );
}
