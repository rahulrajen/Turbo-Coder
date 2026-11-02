import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countCoins, type Frame, type Level, type RunResult, onTrack } from '../game/engine';
import { loadDraft, saveDraft } from '../game/drafts';
import { type Block, checkNames, cloneBlocks, countBlocks, countCodeLines, featuresOfBlocks, featuresOfCode, toCode } from '../game/ast';
import { runBlocks } from '../game/interpret';
import { runText } from '../game/runText';
import { type Progress, type WinInfo, type WinSummary, starsFor } from '../game/progress';
import { chapterFor } from '../game/chapters';
import { CARS, carById, levelCar } from '../game/cars';
import { MODES, TIERS, blockLimit, lineLimit, mustUseText } from '../game/rules';
import { BlockHelp } from './Guide';
import { type Sfx, play } from '../game/sound';
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
  onEasy: (easy: boolean) => void;
}

/** Time per car move. Long runs speed up a little so kids aren't left waiting. */
const stepMsFor = (frames: number) => (frames > 80 ? 200 : frames > 40 ? 280 : 360);

const CHEERS = ['Almost there! Try again.', "Don't give up! Good racers keep trying.", 'Every mistake helps you learn!', 'So close! One more try!', 'Check each turn carefully.'];
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

export function LevelScreen({ level, progress, hasPrev, hasNext, onExit, onGoto, onWin, onMode, onSeenChapter, onCar, onEasy }: Props) {
  const text = progress.codeMode;
  const chapter = chapterFor(level);
  const [draft] = useState(() => loadDraft(level.id));
  const [blocks, setBlocksRaw] = useState<Block[]>(() => draft.blocks ?? (level.starter ? cloneBlocks(level.starter) : []));
  const [undo, setUndo] = useState<Block[][]>([]);
  const [redo, setRedo] = useState<Block[][]>([]);
  const [active, setActive] = useState('');
  const [code, setCode] = useState(() => draft.code ?? starterCode(level));
  const [codeDirty, setCodeDirty] = useState(draft.codeDirty ?? false);
  const [replaceAsk, setReplaceAsk] = useState(false);
  // 0 = the main track; 1, 2 = test tracks (the same program must win on them too)
  const [view, setView] = useState(0);
  const [trackResults, setTrackResults] = useState<('pass' | 'fail')[]>([]);
  const shown = useMemo(() => onTrack(level, view), [level, view]);
  const [car, setCar] = useState(() => startCar(level));
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [openGates, setOpenGates] = useState<Set<string>>(new Set());
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const [honking, setHonking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  // a counter goes with the fun kind, so "Repeat 3: Spin" spins three times instead of once
  const [funKind, setFunKind] = useState<{ kind: string; n: number } | null>(null);
  const [crashed, setCrashed] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stepMs, setStepMs] = useState(360);
  // when the track scrolls out of sight (long programs), a small copy of it floats in the corner
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardVisible, setBoardVisible] = useState(true);
  const [miniSmall, setMiniSmall] = useState(false);
  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setBoardVisible(e.intersectionRatio > 0.35), { threshold: [0, 0.35, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [win, setWin] = useState<(WinSummary & { tip: string }) | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [fails, setFails] = useState(draft.fails ?? 0);
  const [showHint, setShowHint] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [story, setStory] = useState<'intro' | 'corner' | null>(() => (progress.seenChapters.includes(level.chapter) ? null : 'intro'));
  const [picker, setPicker] = useState(false);
  const [help, setHelp] = useState(false);
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
    setUndo((u) => [...u.slice(-49), blocks]);
    setRedo([]); // a new change starts a new future
    setBlocksRaw(next);
  };
  const undoBlocks = () => {
    if (!undo.length || running) return;
    setRedo((r) => [...r, blocks]);
    setBlocksRaw(undo[undo.length - 1]);
    setUndo((u) => u.slice(0, -1));
    play('tap', sfx);
  };
  const redoBlocks = () => {
    if (!redo.length || running) return;
    setUndo((u) => [...u, blocks]);
    setBlocksRaw(redo[redo.length - 1]);
    setRedo((r) => r.slice(0, -1));
    play('tap', sfx);
  };

  const reset = useCallback(() => {
    stop();
    setCar(startCar(shown));
    setTaken(new Set());
    setOpenGates(new Set());
    setPuffs([]);
    setPops([]);
    setBubble(null);
    setHonking(false);
    setCelebrate(false);
    setFunKind(null);
    setCrashed(false);
    setRunning(false);
    setMessage(null);
  }, [shown]);
  // switching tracks puts the car on that track's start
  useEffect(() => reset(), [reset]);

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
    /** result on each track the mode needs (index 0 = main track) */
    results: RunResult[];
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
      failRun(`🤔 There is a problem in your code: ${res.error}`);
    } else if (res.outcome === 'finish' && !c.conceptUsed) {
      // reached the flag, but without the idea this level teaches: not a win yet
      play('almost', sfx);
      failRun(`🏁 You reached the flag! But this track is for ${mustUseText(needUse)}. Use it in your program to finish the level.`);
    } else if (res.outcome === 'finish' && c.results.some((r) => r.outcome !== 'finish')) {
      // wins here, but not on every track: the program only fits this one road
      const bad = c.results.findIndex((r) => r.outcome !== 'finish');
      play('almost', sfx);
      failRun(`✅ It works on this track! But it does not work on 🧪 Track ${bad + 1}. Tap Track ${bad + 1} above the road and press GO to see what happens there. Make your program work on every track!`);
    } else if (res.outcome === 'finish') {
      const stars = starsFor(c.used, c.par, c.conceptUsed);
      const perfect = c.attemptNo === 1 && stars === 3;
      play(perfect ? 'fanfare' : 'win', sfx);
      const summary = onWin(level.id, { stars, coins: c.results[0].coins, perfect, codeMode: c.text });
      const unit = c.text ? 'lines' : 'blocks';
      let tip = '';
      if (stars < 3) tip = `Use ${c.par} ${unit} or less to get ⭐⭐⭐`;
      else if (c.attemptNo > 1 && !best?.perfect && !perfect) tip = 'Come back another day and win on your very first GO to get a 👑 Perfect Run bonus!';
      setWin({ ...summary, tip });
    } else if (res.outcome === 'crash') {
      const crash = [...res.frames].reverse().find((f) => f.event === 'crash');
      const onGate = crash && shown.grid[crash.y]?.[crash.x] === 'G';
      failRun(onGate ? '🚪 The gate is closed! Face the gate and say the secret word first.' : `💥 Oops! The car went off the road. ${CHEERS[fails % CHEERS.length]}`);
    } else if (res.outcome === 'limit') {
      failRun(`♾️ ${res.error ?? 'Your loop keeps going and never reaches the flag. Check when it should stop.'}`);
    } else {
      failRun('🛑 The car stopped before the flag. Add more blocks!');
    }
  };

  const playFrames = (res: RunResult, c: Ctx, myRun: number) => {
    // a loop that never ends would take minutes to watch; show the start, then explain
    const frames: Frame[] = res.outcome === 'limit' ? res.frames.slice(0, 24) : res.frames;
    const ms = stepMsFor(frames.length);
    setStepMs(ms);
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
          play(f.event === 'say' ? 'say' : 'honk', sfx, progress.cosmetics.horn);
          timer.current = window.setTimeout(tick, Math.max(ms, 650));
          return;
        case 'fun':
          setFunKind(f.text ? { kind: f.text, n: ++uid.current } : null);
          play(f.text as Sfx, sfx);
          timer.current = window.setTimeout(() => {
            setFunKind(null);
            tick();
          }, f.text === 'sing' ? 1100 : 800);
          return;
        case 'finish':
          // victory spin before the prize screen (not when the must-use block is missing: that is not a win yet)
          if (c.conceptUsed) setCelebrate(true);
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
    // "empty" means nothing at all: a program of only fun blocks counts 0 but is still a program
    const empty = text ? !code.replace(/\/\/.*$/gm, '').trim() : blocks.length === 0;
    if (empty) {
      setMessage(text ? '✍️ Type some code first!' : '🧩 Add some blocks first!');
      return;
    }
    if (!text) {
      const nameProblem = checkNames(blocks, shown.data);
      if (nameProblem) {
        setMessage(`🏷️ ${nameProblem}`);
        return;
      }
    }
    const limit = maxAllowed;
    if (used > limit) {
      setMessage(
        text
          ? `📏 Too many lines! This track allows only ${limit}. Can a loop or a function make it shorter?${easy ? '' : ' Or switch to 🐣 Easy mode for more room.'}`
          : `📏 Too many blocks! This track allows only ${limit}. Can a loop or a function make it shorter?${easy ? '' : ' Or switch to 🐣 Easy mode for more room.'}`,
      );
      return;
    }
    const myRun = runId.current;
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);
    setRunning(true);
    const features = text ? featuresOfCode(code) : featuresOfBlocks(blocks);
    const ctx: Ctx = {
      used,
      par: text ? level.par.lines : level.par.blocks,
      conceptUsed: needUse.every((f) => features.has(f)),
      attemptNo,
      text,
      results: [],
    };
    // run the program on the main track and every test track this mode needs; watch the one on screen
    const tracks = Array.from({ length: needTracks + 1 }, (_, i) => i);
    if (!tracks.includes(view)) tracks.push(view);
    const results: RunResult[] = [];
    for (const t of tracks) {
      const lv = onTrack(level, t);
      results[t] = text ? await runText(lv, code) : runBlocks(lv, blocks);
      if (myRun !== runId.current) return; // Reset was pressed (or the level closed) while the code was running
    }
    ctx.results = results.slice(0, needTracks + 1);
    setTrackResults(ctx.results.map((r) => (r.outcome === 'finish' ? 'pass' : 'fail')));
    const res = results[view];
    if (res.frames.length <= 1) {
      finishRun(res, ctx);
      return;
    }
    playFrames(res, ctx, myRun);
  };

  const used = text ? countCodeLines(code) : countBlocks(blocks);
  const par = text ? level.par.lines : level.par.blocks;
  const easy = progress.easyMode;
  // Easy mode: only the world's main idea, and only one test track
  const needUse = easy ? level.use.slice(0, 1) : level.use;
  const needTracks = easy ? Math.min(1, level.tests.length) : level.tests.length;
  const maxAllowed = text ? lineLimit(level, easy) : blockLimit(level, easy);
  const best = progress.levels[level.id];
  const totalCoins = countCoins(shown);

  const boardView = (
    <Board
      level={shown}
      cosmetics={progress.cosmetics}
      car={car}
      taken={taken}
      openGates={openGates}
      crashed={crashed}
      speedMs={stepMs - 40}
      puffs={puffs}
      pops={pops}
      bubble={bubble}
      mood={celebrate ? 'win' : running ? 'moving' : 'idle'}
      honking={honking}
      fun={funKind?.kind ?? null}
      funKey={funKind?.n}
    />
  );

  return (
    <div className="level-screen" data-world={chapter.world}>
      {!boardVisible && !win && !story && !picker && !help && miniSmall && (
        <button className="mini-track-pill" onClick={() => setMiniSmall(false)} aria-label="Show the small track">
          🗺️ Track
        </button>
      )}
      {!boardVisible && !win && !story && !picker && !help && !miniSmall && (
        <div className="mini-track" aria-label="Small view of the track">
          <button className="mini-hide" onClick={() => setMiniSmall(true)} aria-label="Hide the small track">
            –
          </button>
          <button className="mini-board" onClick={() => boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} title="Show the big track">
            {boardView}
          </button>
          <div className="mini-controls">
            <button className="btn go small" onClick={go} disabled={running}>
              ▶ GO
            </button>
            <button className="btn small" onClick={reset}>
              ↺
            </button>
          </div>
          {message && <div className="mini-msg">{message}</div>}
        </div>
      )}
      <div className="level-top">
        <button className="btn small map-btn" onClick={onExit}>
          🏠 Map
        </button>
        <div className="level-nav">
          <button className="btn ghost small" disabled={!hasPrev} onClick={() => onGoto(level.id - 1)} aria-label="previous level">
            ◀
          </button>
          <div className="level-title">
            <small>
              {chapter.emoji} {chapter.name} · Level {level.id}
              <em className={`tier-tag ${level.tier}`}>{TIERS[level.tier]}</em>
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
              {needUse.length > 0 && (
                <div className="mission">
                  🎯 Must use: <b>{mustUseText(needUse)}</b>
                  {easy && level.use.length > 1 && <small className="mission-more"> (🏎️ Normal mode also needs {mustUseText(level.use.slice(1))})</small>}
                </div>
              )}
              {level.tests.length > 0 && (
                <div className="mission tests-note">
                  🧪 Your program must also work on {needTracks === 1 ? '1 test track' : `${needTracks} test tracks`}. Use the car's eyes, boxes and lists, not memory!
                </div>
              )}
              <div className="hint-row">
                <button className="btn small help-btn" onClick={() => setHelp(true)}>
                  📖 Block Help
                </button>
                {fails >= HINT_AFTER ? (
                  <button className="link" onClick={() => setShowHint((s) => !s)}>
                    {showHint ? 'Hide hint' : '💡 Show hint'}
                  </button>
                ) : (
                  <small className="locked-hint">
                    💡 Hint opens after {HINT_AFTER} tries ({Math.min(fails, HINT_AFTER)}/{HINT_AFTER})
                  </small>
                )}
                <button className="link" onClick={() => setStory('corner')}>
                  📘 Lesson
                </button>
              </div>
              {fails >= HINT_AFTER && showHint && <p className="hint">{level.hint}</p>}
            </div>
          </div>
          {level.tests.length > 0 && (
            <div className="track-tabs" role="tablist" aria-label="Tracks">
              {[0, ...level.tests.map((_, i) => i + 1)].map((t) => {
                const r = trackResults[t];
                const needed = t <= needTracks;
                return (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={view === t}
                    className={`${view === t ? 'on' : ''} ${r ?? ''} ${needed ? '' : 'optional'}`}
                    disabled={running}
                    onClick={() => {
                      setView(t);
                      play('click', sfx);
                    }}
                  >
                    {t === 0 ? '🏁' : '🧪'} Track {t + 1} {r === 'pass' ? '✅' : r === 'fail' ? '❌' : ''}
                    {!needed && <small>not needed in Easy</small>}
                  </button>
                );
              })}
            </div>
          )}
          <div ref={boardRef}>{boardView}</div>
          {message && <div className="message">{message}</div>}
          <div className="controls">
            <button className="btn go" onClick={go} disabled={running}>
              ▶ GO!
            </button>
            <button className="btn" onClick={reset}>
              ↺ Reset
            </button>
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
          <div className="mode-row" role="group" aria-label="Game mode">
            <span>Mode:</span>
            {(['easy', 'normal'] as const).map((m) => (
              <button
                key={m}
                className={(m === 'easy') === easy ? 'on' : ''}
                disabled={running}
                title={MODES[m].text}
                onClick={() => {
                  if ((m === 'easy') !== easy) {
                    onEasy(m === 'easy');
                    play('click', sfx);
                  }
                }}
              >
                {MODES[m].icon} {MODES[m].name}
              </button>
            ))}
            <small>{MODES[easy ? 'easy' : 'normal'].text}</small>
          </div>
          <div className="par">
            {text ? 'Lines used' : 'Blocks used'}:{' '}
            <b className={used > maxAllowed ? 'over-limit' : ''}>
              {used} / {maxAllowed} max
            </b>{' '}
            · ⭐⭐⭐ needs {par} or less
            {attempts === 0 && !best?.perfect && <div className="perfect-tip">🎯 Win on your 1st try with ⭐⭐⭐ to get a 👑 Perfect Run bonus!</div>}
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
              <div className="undo-row">
                <button className="btn ghost small" disabled={running || !undo.length} onClick={undoBlocks} title="Undo">
                  ↶ Undo
                </button>
                <button className="btn ghost small" disabled={running || !redo.length} onClick={redoBlocks} title="Redo">
                  ↷ Redo
                </button>
              </div>
              <BlockEditor blocks={blocks} onChange={setBlocks} tools={level.tools} data={shown.data} active={active} onActive={setActive} locked={running} onTap={() => play('tap', sfx)} limit={blockLimit(level, easy)} limitTip={easy ? '' : ' Or switch to 🐣 Easy mode for more room.'} />
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
              data={shown.data}
              locked={running}
            />
            </>
          )}
        </section>
      </div>

      {help && <BlockHelp level={level} sound={sfx} easy={easy} text={text} onClose={() => setHelp(false)} />}
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
