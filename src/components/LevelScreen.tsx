import { useCallback, useEffect, useRef, useState } from 'react';
import { countCoins, type Frame, type Level, type RunResult } from '../game/engine';
import { loadDraft, saveDraft } from '../game/drafts';
import { type Block, type Feature, checkNames, cloneBlocks, countBlocks, countCodeLines, featuresOfBlocks, featuresOfCode, toCode } from '../game/ast';
import { runBlocks } from '../game/interpret';
import { runText } from '../game/runText';
import { type Progress, type WinInfo, type WinSummary, starsFor } from '../game/progress';
import { chapterOf } from '../game/chapters';
import { CARS, carById, levelCar } from '../game/cars';
import { play } from '../game/sound';
import { Board, type Pop, type Puff } from './Board';
import { BlockEditor } from './BlockEditor';
import { CodeEditor } from './CodeEditor';
import { WinModal } from './WinModal';
import { LevelPicker, Story } from './Story';

interface Props {
  level: Level;
  progress: Progress;
  hasPrev: boolean;
  hasNext: boolean;
  onExit: () => void;
  onGoto: (id: number) => void;
  onWin: (levelId: number, info: WinInfo) => WinSummary;
  onMode: (codeMode: boolean) => void;
  onSeenChapter: (chapter: number) => void;
  onCar: (body: string) => void;
}

const SPEEDS = [
  { label: '🐢', ms: 600, name: 'Slow' },
  { label: '🚗', ms: 380, name: 'Normal' },
  { label: '🏎️', ms: 180, name: 'Fast' },
];

const USE_LABEL: Record<Feature, string> = {
  repeat: 'a loop',
  while: 'a while loop',
  if: 'if / else',
  let: 'a variable',
  function: 'a function',
  foreach: 'a for…of loop',
  onsign: 'onSign',
  say: 'say()',
};

const CHEERS = ['Almost! Try again, champ!', "Don't give up, racers never quit!", 'Every bug you fix makes you stronger!', 'So close! One more try!', 'Check each turn carefully!'];
const HINT_AFTER = 5;

function startCar(level: Level) {
  let x = 0;
  let y = 0;
  level.grid.forEach((r, ry) => {
    if (r.includes('S')) {
      x = r.indexOf('S');
      y = ry;
    }
  });
  return { x, y, rot: level.startDir * 90 };
}

const starterCode = (level: Level) => (level.starter ? toCode(level.starter) : '// Type your code here!\n');

export function LevelScreen({ level, progress, hasPrev, hasNext, onExit, onGoto, onWin, onMode, onSeenChapter, onCar }: Props) {
  const text = progress.codeMode;
  const chapter = chapterOf(level.id);
  const [draft] = useState(() => loadDraft(level.id));
  const [blocks, setBlocksRaw] = useState<Block[]>(() => draft.blocks ?? (level.starter ? cloneBlocks(level.starter) : []));
  const [undo, setUndo] = useState<Block[][]>([]);
  const [active, setActive] = useState('');
  const [code, setCode] = useState(() => draft.code ?? starterCode(level));
  const [codeDirty, setCodeDirty] = useState(draft.codeDirty ?? false);
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [car, setCar] = useState(() => startCar(level));
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [openGates, setOpenGates] = useState<Set<string>>(new Set());
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const [honking, setHonking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [win, setWin] = useState<(WinSummary & { tip: string }) | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [fails, setFails] = useState(draft.fails ?? 0);
  const [showHint, setShowHint] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [story, setStory] = useState<'intro' | 'corner' | null>(() => (progress.seenChapters.includes(level.chapter) ? null : 'intro'));
  const [picker, setPicker] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const uid = useRef(0);
  // every run gets a number; Reset, a new GO or leaving the level bumps it so old runs stop dead
  const runId = useRef(0);
  const sfx = progress.sound;

  const stop = () => {
    runId.current++;
    window.clearTimeout(timer.current);
  };
  useEffect(() => stop, []);

  // keep unfinished work, so leaving the level (or reloading) never loses it
  useEffect(() => saveDraft(level.id, { blocks, code, codeDirty }), [level.id, blocks, code, codeDirty]);

  const setBlocks = (next: Block[]) => {
    setUndo((u) => [...u.slice(-29), blocks]);
    setBlocksRaw(next);
  };
  const undoBlocks = () => {
    if (!undo.length || running) return;
    setBlocksRaw(undo[undo.length - 1]);
    setUndo((u) => u.slice(0, -1));
    play('tap', sfx);
  };

  const reset = useCallback(() => {
    stop();
    setCar(startCar(level));
    setTaken(new Set());
    setOpenGates(new Set());
    setPuffs([]);
    setPops([]);
    setBubble(null);
    setHonking(false);
    setCelebrate(false);
    setCrashed(false);
    setRunning(false);
    setMessage(null);
  }, [level]);

  const switchMode = (toText: boolean) => {
    if (running || toText === text) return;
    if (toText && !codeDirty) setCode(blocks.length > 0 ? toCode(blocks) : starterCode(level));
    onMode(toText);
    play('tap', sfx);
  };

  interface Ctx {
    used: number;
    par: number;
    conceptUsed: boolean;
    attemptNo: number;
    text: boolean;
  }

  const failRun = (note: string) => {
    setMessage(note);
    const n = fails + 1;
    setFails(n);
    saveDraft(level.id, { fails: n });
    if (n === HINT_AFTER) setShowHint(true);
  };

  const finishRun = (res: RunResult, c: Ctx) => {
    setRunning(false);
    if (res.error && res.outcome !== 'limit') {
      failRun(`🤔 Hmm, there's a problem in your code: ${res.error}`);
    } else if (res.outcome === 'finish') {
      const stars = starsFor(c.used, c.par, c.conceptUsed);
      const perfect = c.attemptNo === 1 && stars === 3;
      play(perfect ? 'fanfare' : 'win', sfx);
      const summary = onWin(level.id, { stars, coins: res.coins, perfect, codeMode: c.text });
      const unit = c.text ? 'lines' : 'blocks';
      let tip = '';
      if (stars < 3) {
        tip = !c.conceptUsed ? `Try using ${level.use.map((f) => USE_LABEL[f]).join(' and ')} for ⭐⭐⭐` : `Use ${c.par} ${unit} or fewer for ⭐⭐⭐`;
      } else if (c.attemptNo > 1 && !best?.perfect && !perfect) tip = 'Come back another time and win on your very first GO for a 👑 Perfect Run bonus!';
      setWin({ ...summary, tip });
    } else if (res.outcome === 'crash') {
      const crash = [...res.frames].reverse().find((f) => f.event === 'crash');
      const onGate = crash && level.grid[crash.y]?.[crash.x] === 'G';
      failRun(onGate ? '🚪 The gate is closed! Face it and say the secret word first.' : `💥 Oops! The car left the road. ${CHEERS[fails % CHEERS.length]}`);
    } else if (res.outcome === 'limit') {
      failRun(`♾️ ${res.error ?? 'Your loop keeps going and never reaches the flag! Check when it should stop.'}`);
    } else {
      failRun('🛑 The car stopped before the flag. Add more commands!');
    }
  };

  const playFrames = (res: RunResult, c: Ctx, myRun: number) => {
    const ms = SPEEDS[speed].ms;
    // a loop that never ends would take minutes to watch; show the start, then explain
    const frames: Frame[] = res.outcome === 'limit' ? res.frames.slice(0, 24) : res.frames;
    let i = 1;
    let last = frames[0];
    const addPop = (x: number, y: number, t: string) => {
      const id = ++uid.current;
      setPops((p) => [...p, { id, x, y, text: t }]);
      window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 1000);
    };
    const tick = () => {
      if (myRun !== runId.current) return; // reset, re-run or left the level
      setBubble(null);
      setHonking(false);
      if (i >= frames.length) {
        finishRun(res, c);
        return;
      }
      const f = frames[i++];
      switch (f.event) {
        case 'crash':
          setCar({ x: last.x, y: last.y, rot: last.rot });
          setCrashed(true);
          play('crash', sfx);
          timer.current = window.setTimeout(tick, 700);
          return;
        case 'coin':
          if (f.key) {
            const key = f.key;
            setTaken((t) => new Set(t).add(key));
            addPop(f.x, f.y, '+1 🪙');
            play('coin', sfx);
          }
          tick(); // pickup shares the move's time slot
          return;
        case 'gate':
          if (f.key) {
            const key = f.key;
            setOpenGates((g) => new Set(g).add(key));
            addPop(f.x, f.y, 'OPEN!');
            play('gate', sfx);
          }
          timer.current = window.setTimeout(tick, 350);
          return;
        case 'say':
        case 'honk':
          setBubble(f.text ?? '');
          if (f.event === 'honk') setHonking(true);
          play(f.event === 'say' ? 'say' : 'honk', sfx);
          timer.current = window.setTimeout(tick, Math.max(ms, 650));
          return;
        case 'finish':
          setCelebrate(true); // victory spin before the prize screen
          timer.current = window.setTimeout(tick, 1000);
          return;
        default: {
          const id = ++uid.current;
          if (f.event === 'move') setPuffs((p) => [...p.slice(-10), { id, x: last.x, y: last.y }]);
          last = f;
          setCar({ x: f.x, y: f.y, rot: f.rot });
          if (f.event === 'move') play('move', sfx);
          timer.current = window.setTimeout(tick, ms);
        }
      }
    };
    timer.current = window.setTimeout(tick, 150);
  };

  const go = async () => {
    reset();
    play('tap', sfx);
    const used = text ? countCodeLines(code) : countBlocks(blocks);
    if (used === 0) {
      setMessage(text ? '✍️ Type some code first!' : '🧩 Add some blocks first!');
      return;
    }
    if (!text) {
      const nameProblem = checkNames(blocks, level.data);
      if (nameProblem) {
        setMessage(`🏷️ ${nameProblem}`);
        return;
      }
    }
    const myRun = runId.current;
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);
    setRunning(true);
    const features = text ? featuresOfCode(code) : featuresOfBlocks(blocks);
    const ctx: Ctx = {
      used,
      par: text ? level.par.lines : level.par.blocks,
      conceptUsed: level.use.every((f) => features.has(f)),
      attemptNo,
      text,
    };
    const res = text ? await runText(level, code) : runBlocks(level, blocks);
    if (myRun !== runId.current) return; // Reset was pressed (or the level closed) while the code was running
    if (res.frames.length <= 1) {
      finishRun(res, ctx);
      return;
    }
    playFrames(res, ctx, myRun);
  };

  const used = text ? countCodeLines(code) : countBlocks(blocks);
  const par = text ? level.par.lines : level.par.blocks;
  const best = progress.levels[level.id];
  const totalCoins = countCoins(level);

  return (
    <div className="level-screen" data-world={chapter.world}>
      <div className="level-top">
        <button className="btn ghost small" onClick={onExit}>
          ← Map
        </button>
        <div className="level-nav">
          <button className="btn ghost small" disabled={!hasPrev} onClick={() => onGoto(level.id - 1)} aria-label="previous level">
            ◀
          </button>
          <div className="level-title">
            <small>
              {chapter.emoji} {chapter.name} · Level {level.id}
              {level.boss && <em className="boss-tag">BOSS</em>}
            </small>
            <h2>{level.title}</h2>
          </div>
          <button className="btn ghost small" disabled={!hasNext} onClick={() => onGoto(level.id + 1)} aria-label="next level">
            ▶
          </button>
        </div>
        <div className="level-meta">
          <button className="btn ghost small" onClick={() => setPicker(true)} aria-label="choose level">
            🗂️ <span className="hide-sm">Levels</span>
          </button>
          <span title="Coins on this track">
            🪙 {taken.size}/{totalCoins} {best?.perfect ? '👑' : ''}
            {'⭐'.repeat(best?.stars ?? 0)}
          </span>
        </div>
      </div>

      <div className="level-grid">
        <section className="stage">
          <div className="coach">
            <span className="coach-face">🤖</span>
            <div className="coach-bubble">
              <p>{level.story}</p>
              <div className="hint-row">
                {fails >= HINT_AFTER ? (
                  <button className="link" onClick={() => setShowHint((s) => !s)}>
                    {showHint ? 'Hide hint' : '💡 Show hint'}
                  </button>
                ) : (
                  <small className="locked-hint">
                    💡 Hint unlocks after {HINT_AFTER} tries ({Math.min(fails, HINT_AFTER)}/{HINT_AFTER})
                  </small>
                )}
                <button className="link" onClick={() => setStory('corner')}>
                  📘 Code Corner
                </button>
              </div>
              {fails >= HINT_AFTER && showHint && <p className="hint">{level.hint}</p>}
            </div>
          </div>
          <Board
            level={level}
            cosmetics={progress.cosmetics}
            car={car}
            taken={taken}
            openGates={openGates}
            crashed={crashed}
            speedMs={SPEEDS[speed].ms - 40}
            puffs={puffs}
            pops={pops}
            bubble={bubble}
            mood={celebrate ? 'win' : running ? 'moving' : 'idle'}
            honking={honking}
          />
          {message && <div className="message">{message}</div>}
          <div className="controls">
            <button className="btn go" onClick={go} disabled={running}>
              ▶ GO!
            </button>
            <button className="btn" onClick={reset}>
              ↺ Reset
            </button>
            <div className="speed" role="group" aria-label="Driving speed">
              <span className="speed-label">Speed</span>
              {SPEEDS.map((s, i) => (
                <button key={s.label} className={i === speed ? 'on' : ''} disabled={running} onClick={() => setSpeed(i)} title={s.name} aria-label={`${s.name} speed`}>
                  {s.label}
                  <small>{s.name}</small>
                </button>
              ))}
            </div>
          </div>
          <label className="car-pick">
            <span>🚘 Car</span>
            <select value={progress.cosmetics.body} disabled={running} onChange={(e) => onCar(e.target.value)}>
              <option value="auto">Track car: {carById(levelCar(level.id)).name}</option>
              {CARS.filter((c) => progress.owned.includes(`body:${c.id}`)).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <small>More cars in the 🔧 Garage</small>
          </label>
          <div className="par">
            {text ? 'Lines of code' : 'Blocks used'}: <b>{used}</b> · ⭐⭐⭐ needs {par} or fewer
            {level.use.length > 0 && <> and {level.use.map((f) => USE_LABEL[f]).join(' + ')}</>}
            {attempts === 0 && !best?.perfect && <div className="perfect-tip">🎯 Win on your 1st try with ⭐⭐⭐ for a 👑 Perfect Run bonus!</div>}
            {best?.perfect && <div className="perfect-tip">👑 You got a Perfect Run here!</div>}
          </div>
        </section>

        <section className="editor">
          <div className="mode-switch" role="group" aria-label="editor mode">
            <button className={!text ? 'on' : ''} disabled={running} onClick={() => switchMode(false)}>
              🧩 Blocks
            </button>
            <button className={text ? 'on' : ''} disabled={running} onClick={() => switchMode(true)}>
              ⌨️ Code
            </button>
          </div>
          {!text ? (
            <>
              {undo.length > 0 && (
                <button className="btn ghost small undo" disabled={running} onClick={undoBlocks}>
                  ↶ Undo
                </button>
              )}
              <BlockEditor blocks={blocks} onChange={setBlocks} tools={level.tools} data={level.data} active={active} onActive={setActive} locked={running} onTap={() => play('tap', sfx)} />
              {blocks.length > 0 && (
                <div className="codepeek">
                  <button className="link" onClick={() => setShowCode((s) => !s)}>
                    {showCode ? 'Hide' : '👀 See my blocks as real code'}
                  </button>
                  {showCode && <pre>{toCode(blocks)}</pre>}
                </div>
              )}
            </>
          ) : (
            <>
            {blocks.length > 0 && toCode(blocks) !== code && (
              <div className="sync-row">
                <button
                  className="btn ghost small"
                  disabled={running}
                  onClick={() => {
                    if (codeDirty && !replaceAsk) {
                      setReplaceAsk(true);
                      return;
                    }
                    setCode(toCode(blocks));
                    setCodeDirty(false);
                    setReplaceAsk(false);
                  }}
                >
                  {replaceAsk ? '⚠️ Tap again to replace your typed code' : '🧩 → ⌨️ Turn my blocks into code'}
                </button>
                {replaceAsk && (
                  <button className="link" onClick={() => setReplaceAsk(false)}>
                    keep my code
                  </button>
                )}
              </div>
            )}
            <CodeEditor
              code={code}
              onChange={(c) => {
                setCode(c);
                setCodeDirty(true);
              }}
              tools={level.tools}
              data={level.data}
              locked={running}
            />
            </>
          )}
        </section>
      </div>

      {story && (
        <Story
          chapter={chapter}
          intro={story === 'intro'}
          onClose={() => {
            if (story === 'intro') onSeenChapter(chapter.id);
            setStory(null);
          }}
        />
      )}
      {picker && (
        <LevelPicker
          progress={progress}
          current={level.id}
          onClose={() => setPicker(false)}
          onPlay={(id) => {
            setPicker(false);
            onGoto(id);
          }}
        />
      )}
      {win && (
        <WinModal
          summary={win}
          level={level}
          progress={progress}
          hasNext={hasNext}
          onNext={() => onGoto(level.id + 1)}
          onMap={onExit}
          onReplay={() => {
            setWin(null);
            reset();
          }}
        />
      )}
    </div>
  );
}
