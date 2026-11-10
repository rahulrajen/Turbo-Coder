import { useEffect, useMemo, useRef, useState } from 'react';
import { type Block, type BlockType, FUN_TYPES, countBlocks, getSlot, isFun, slotKeys, toCode } from '../game/ast';
import { META } from '../game/blockMeta';
import { CHAPTERS } from '../game/chapters';
import { DEFAULT_PROGRESS, REWARDS, RANKS } from '../game/progress';
import { runBlocks } from '../game/interpret';
import type { Dir, Frame, Level } from '../game/engine';
import { type Part, buildGrid } from '../game/route';
import { type Sfx, play } from '../game/sound';
import { MODES, blockLimit, lineLimit } from '../game/rules';
import { F, L, R, call, chg, cmp, each, fn, iff, mk, no, num, ok, onsign, rep, say, setv, str, v, whl } from '../game/dsl';
import { Board } from './Board';

// =====================================================================
// What every block does, in simple words, with a tiny track to show it.
// =====================================================================

interface Demo {
  parts: Part[];
  dir?: Dir;
  ref: Block[];
  data?: Record<string, unknown>;
  signs?: Record<number, number>;
  gates?: number[];
  secret?: string;
}

interface Guide {
  what: string;
  how: string;
  demo: Demo;
}

const fun = (type: BlockType): Block => ({ id: `g-${type}-${Math.random()}`, type } as Block);

export const BLOCK_GUIDE: Record<BlockType, Guide> = {
  forward: {
    what: 'Moves the car ONE step forward, in the direction it is facing.',
    how: 'Add one Drive block for every step. To go 3 steps, use 3 Drive blocks (or a Repeat).',
    demo: { parts: [3], ref: [F(), F(), F()] },
  },
  left: {
    what: 'Turns the car to ITS left side. The car does not move, it only turns.',
    how: 'Use it at a corner. Think from the driver\'s seat: left is the driver\'s left hand.',
    demo: { parts: [1, 'L', 2], ref: [F(), L(), F(), F()] },
  },
  right: {
    what: 'Turns the car to ITS right side. The car does not move, it only turns.',
    how: 'Use it at a corner where the road goes to the driver\'s right hand.',
    demo: { parts: [1, 'R', 2], ref: [F(), R(), F(), F()] },
  },
  repeat: {
    what: 'Does the blocks inside it again and again, as many times as you say.',
    how: 'Tap Repeat, then tap blocks to put them INSIDE it. Change the number to choose how many times. Put at least one real block (like Drive) inside: only fun blocks does not count as using Repeat.',
    demo: { parts: [5], ref: [rep(5, F())] },
  },
  while: {
    what: 'Keeps doing the blocks inside it AS LONG AS the question is true. It stops by itself when the answer becomes false.',
    how: 'Pick a question, for example "NOT atFinish" (not at the flag yet). Put Drive inside.',
    demo: { parts: [4], ref: [whl(no('atFinish'), F())] },
  },
  if: {
    what: 'Asks a question. If the answer is YES, it does the "then" blocks. If NO, it does the "else" blocks.',
    how: 'Choose a question like roadAhead (is there road in front?). Tap "+ add else" to give it an else part.',
    demo: { parts: [2, 'R', 2], ref: [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [R()]))] },
  },
  let: {
    what: 'Makes a new BOX (a variable) with a name, and puts a number or a word inside it.',
    how: 'Type a name like steps, put 3 in it. Now you can use "steps" anywhere you need that number.',
    demo: { parts: [3], ref: [mk('steps', num(3)), rep(v('steps'), F())] },
  },
  set: {
    what: 'Puts a NEW value into a box you already made. The old value is thrown away.',
    how: 'First make the box with Make box. Later, use Set box to change what is inside.',
    demo: { parts: [2, 'L', 3], ref: [mk('n', num(2)), rep(v('n'), F()), L(), setv('n', num(3)), rep(v('n'), F())] },
  },
  change: {
    what: 'Adds a number to a box. Use a minus number (like -1) to take away.',
    how: 'Great for counting: Change n by 1 makes n one bigger each time.',
    demo: { parts: [1, 'R', 2], ref: [mk('n', num(1)), rep(v('n'), F()), R(), chg('n', num(1)), rep(v('n'), F())] },
  },
  function: {
    what: 'Makes YOUR OWN new block from a group of blocks. Give it a name.',
    how: 'Put blocks inside it once. Then use Call to run it as many times as you want. You can give it inputs, like n.',
    demo: { parts: [2, 'R', 2], ref: [fn('two', [], F(), F()), call('two'), R(), call('two')] },
  },
  call: {
    what: 'Runs a Function that you made.',
    how: 'First make a Function. Then tap Call and pick its name. If the Function has inputs, fill them in.',
    demo: { parts: [3, 'L', 2], ref: [fn('go', ['n'], rep(v('n'), F())), call('go', num(3)), L(), call('go', num(2))] },
  },
  foreach: {
    what: 'Goes through a LIST one item at a time, and runs the blocks inside for each item.',
    how: 'Pick the list (given to you on the level). The item name, like leg, holds the current item.',
    demo: { parts: [2, 'R', 3], ref: [each('leg', 'legs', rep(v('leg'), F()), R())], data: { legs: [2, 3] } },
  },
  say: {
    what: 'Makes the car speak words. Saying the SECRET word while facing a gate 🚪 opens it.',
    how: 'Type the word, or pick a box that has the word inside.',
    demo: { parts: [3], ref: [F(), say(str('open')), F(), F()], gates: [2], secret: 'open' },
  },
  onsign: {
    what: 'Runs its blocks BY ITSELF every time the car drives over a road sign. The sign number goes into a box called sign.',
    how: 'Put an If inside: if sign = 1 turn left, else turn right. Then just keep driving!',
    demo: { parts: [2, 'R', 2], ref: [onsign('sign', iff(cmp(v('sign'), '==', num(1)), [L()], [R()])), rep(4, F())], signs: { 2: 2 } },
  },
  honk: { what: 'Blows the horn! Just for fun.', how: 'Fun blocks are FREE: they never count in your block total or stars.', demo: { parts: [2], ref: [F(), fun('honk'), F()] } },
  spin: { what: 'The car spins round and round, then keeps facing the same way.', how: 'Fun block, free to use. Try it at the finish line!', demo: { parts: [2], ref: [F(), fun('spin'), F()] } },
  jump: { what: 'The car jumps up and lands in the same place.', how: 'Fun block, free to use.', demo: { parts: [2], ref: [F(), fun('jump'), F()] } },
  dance: { what: 'The car does a little dance with music.', how: 'Fun block, free to use.', demo: { parts: [2], ref: [F(), fun('dance'), F()] } },
  flash: { what: 'Turns on colourful party lights on the track.', how: 'Fun block, free to use.', demo: { parts: [2], ref: [F(), fun('flash'), F()] } },
  sing: { what: 'The car sings a short song.', how: 'Fun block, free to use.', demo: { parts: [2], ref: [F(), fun('sing'), F()] } },
};

/** The car's "eyes": questions you can ask in If, While and Repeat. */
export const SENSOR_GUIDE: [string, string][] = [
  ['roadAhead()', 'Is there road in front of the car? (yes / no)'],
  ['roadLeft()', 'Is there road on the car\'s left side? (yes / no)'],
  ['roadRight()', 'Is there road on the car\'s right side? (yes / no)'],
  ['atFinish()', 'Is the car on the 🏁 flag? (yes / no)'],
  ['coinAhead()', 'Is there a coin 🪙 just in front? (yes / no)'],
  ['distanceAhead()', 'How many road steps are in front? (a number)'],
  ['readSign()', 'The number on the sign under the car (0 if no sign).'],
];

const demoLevel = (d: Demo): Level => {
  const { grid } = buildGrid({ dir: d.dir ?? 1, parts: d.parts, signs: d.signs, gates: d.gates, coins: [] });
  return {
    id: 0,
    chapter: 1,
    index: 0,
    title: '',
    story: '',
    hint: '',
    grid,
    startDir: d.dir ?? 1,
    tools: [],
    ref: d.ref,
    par: { blocks: countBlocks(d.ref), lines: 0 },
    use: [],
    data: d.data ?? {},
    secret: d.secret,
    boss: false,
    tier: 'warmup',
    tests: [],
  };
};

/** A little track that plays the example again and again. */
function DemoTrack({ demo, sound }: { demo: Demo; sound: boolean }) {
  const level = useMemo(() => demoLevel(demo), [demo]);
  const frames = useMemo(() => runBlocks(level, demo.ref).frames, [level, demo]);
  const [i, setI] = useState(0);
  const [openGates, setOpenGates] = useState<Set<string>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const f: Frame = frames[Math.min(i, frames.length - 1)];
  useEffect(() => {
    // the step counter lives here (not in a state updater) so sounds play exactly once per step
    let n = 0;
    const next = () => {
      n++;
      if (n >= frames.length + 3) {
        n = 0; // short pause at the end, then play again
        setOpenGates(new Set());
      } else {
        const fr = frames[n];
        if (fr?.event === 'gate' && fr.key) setOpenGates((g) => new Set(g).add(fr.key!));
        if (fr?.event === 'fun' && fr.text) play(fr.text as Sfx, sound);
        if (fr?.event === 'honk') play('honk', sound);
      }
      setI(n);
      timer.current = window.setTimeout(next, 550);
    };
    timer.current = window.setTimeout(next, 600);
    return () => window.clearTimeout(timer.current);
  }, [frames, sound]);
  // show where the car really is (a crash frame shows the spot it tried to go to)
  const shown = [...frames.slice(0, Math.min(i, frames.length - 1) + 1)].reverse().find((x) => x.event !== 'crash' && x.event !== 'coin') ?? frames[0];
  return (
    <div className="demo-track">
      <Board
        level={level}
        cosmetics={DEFAULT_PROGRESS.cosmetics}
        car={{ x: shown.x, y: shown.y, rot: shown.rot }}
        taken={new Set()}
        openGates={openGates}
        crashed={false}
        speedMs={460}
        puffs={[]}
        pops={[]}
        bubble={f.event === 'say' || f.event === 'honk' ? (f.text ?? null) : null}
        mood={i > 0 && i < frames.length ? 'moving' : 'idle'}
        honking={f.event === 'honk'}
        fun={f.event === 'fun' ? f.text : null}
      />
    </div>
  );
}

/** Shows a block program read-only, with the same colours as the editor. */
export function BlockPills({ blocks }: { blocks: Block[] }) {
  const label = (b: Block) => {
    switch (b.type) {
      case 'repeat':
        return `${b.n.a.k === 'num' ? b.n.a.v : b.n.a.k === 'var' ? b.n.a.name : '…'} times`;
      case 'while':
      case 'if':
        return b.cond.clauses.map((c) => `${c.not ? 'NOT ' : ''}${c.a.k === 'sense' ? c.a.name : c.a.k === 'var' ? c.a.name : ''}${c.op ? ` ${c.op} ${c.b?.k === 'num' ? c.b.v : c.b?.k === 'str' ? `"${c.b.v}"` : ''}` : ''}`).join(' AND ');
      case 'let':
      case 'set':
        return `${b.name} = ${b.e.a.k === 'num' ? b.e.a.v : b.e.a.k === 'sense' ? b.e.a.name : b.e.a.k === 'var' ? b.e.a.name : ''}`;
      case 'change':
        return `${b.name} by ${b.e.a.k === 'num' ? b.e.a.v : ''}`;
      case 'function':
        return `${b.name}${b.params.length ? `(${b.params.join(', ')})` : ''}`;
      case 'call':
        return `${b.name}${b.args.length ? `(${b.args.map((a) => (a.a.k === 'num' ? a.a.v : '…')).join(', ')})` : ''}`;
      case 'foreach':
        return `${b.item} in ${b.list}`;
      case 'say':
        return b.e.a.k === 'str' ? `"${b.e.a.v}"` : '';
      case 'onsign':
        return `(${b.param})`;
      default:
        return '';
    }
  };
  return (
    <div className="pills">
      {blocks.map((b) => (
        <div key={b.id} className={`pill-block ${META[b.type].cls}`}>
          <span>
            {META[b.type].icon} {META[b.type].label} {label(b) && <em>{label(b)}</em>}
          </span>
          {slotKeys(b).map((k) => (
            <div key={k} className="pill-body">
              {b.type === 'if' && <small>{k === 'els' ? 'else' : 'then'}</small>}
              <BlockPills blocks={getSlot(b, k)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Pick a block on the left, see what it does on the right. */
function BlockExplorer({ types, sound }: { types: BlockType[]; sound: boolean }) {
  const [sel, setSel] = useState<BlockType>(types[0]);
  const g = BLOCK_GUIDE[sel];
  return (
    <div className="explorer">
      <div className="explorer-list">
        {types.map((t) => (
          <button
            key={t}
            className={`pal ${META[t].cls} ${t === sel ? 'sel' : ''}`}
            onClick={() => {
              setSel(t);
              play('click', sound);
            }}
          >
            <span className="pi">{META[t].icon}</span>
            {META[t].label}
          </button>
        ))}
      </div>
      <div className="explorer-detail" key={sel}>
        <h3>
          {META[sel].icon} {META[sel].label}
          {isFun(sel) && <span className="free-tag">FREE</span>}
        </h3>
        <p className="what">{g.what}</p>
        <p className="how">👉 {g.how}</p>
        <div className="example">
          <div>
            <b>Example blocks</b>
            <BlockPills blocks={g.demo.ref} />
          </div>
          <div>
            <b>Watch it work</b>
            <DemoTrack demo={g.demo} sound={sound} />
          </div>
        </div>
        <details className="as-code">
          <summary>⌨️ Same thing in code</summary>
          <pre>{toCode(g.demo.ref)}</pre>
        </details>
      </div>
    </div>
  );
}

/** "Block Help" on a level: just the blocks this level gives you. */
export function BlockHelp({ level, sound, easy, text = false, onClose }: { level: Level; sound: boolean; easy: boolean; text?: boolean; onClose: () => void }) {
  const types = level.tools.filter((t) => t in BLOCK_GUIDE);
  const showSensors = level.tools.some((t) => t === 'if' || t === 'while' || t === 'let');
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal guide" role="dialog" aria-label="Block help" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <h2>📖 Block Help</h2>
          <button className="btn ghost small" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="sub">Tap a block to see what it does. This level gives you {types.length} kinds of blocks. In {easy ? MODES.easy.icon + ' Easy' : MODES.normal.icon + ' Normal'} mode your program can have up to {text ? `${lineLimit(level, easy)} lines of code` : `${blockLimit(level, easy)} blocks`} (fun blocks are free).</p>
        <BlockExplorer types={types} sound={sound} />
        {showSensors && <SensorTable />}
      </div>
    </div>
  );
}

function SensorTable() {
  return (
    <div className="sensors">
      <h3>👀 The car's eyes (sensors)</h3>
      <p>Use these questions inside If, While or Repeat:</p>
      <table>
        <tbody>
          {SENSOR_GUIDE.map(([name, text]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <b>NOT</b> flips the answer (yes becomes no). <b>AND</b> means both must be yes. <b>OR</b> means at least one is yes. You can also compare numbers with = ≠ &lt; &gt; ≤ ≥.
      </p>
    </div>
  );
}

// =====================================================================
// The full "How to Play" guide, opened from the Map.
// =====================================================================

const ALL_BLOCKS: BlockType[] = ['forward', 'left', 'right', 'repeat', 'while', 'if', 'let', 'set', 'change', 'function', 'call', 'foreach', 'say', 'onsign', ...FUN_TYPES];

const SECTIONS = [
  { id: 'start', label: '🏁 Start here' },
  { id: 'buttons', label: '🔘 Buttons' },
  { id: 'blocks', label: '🧩 Blocks' },
  { id: 'eyes', label: '👀 Car\'s eyes' },
  { id: 'code', label: '⌨️ Code' },
  { id: 'stars', label: '⭐ Stars & rules' },
  { id: 'rewards', label: '🪙 Rewards' },
  { id: 'garage', label: '🔧 Garage & badges' },
];

const BUTTONS: [string, string][] = [
  ['▶ GO!', 'Runs your program. Watch the car follow your blocks.'],
  ['↺ Reset', 'Puts the car back at the start. Your blocks stay.'],
  ['🏠 Map', 'Goes back to the Map, where you can pick any level.'],
  ['◀ ▶', 'Go to the level before or after this one.'],
  ['🗂️ Levels', 'Opens a list of all levels so you can jump anywhere.'],
  ['🧩 Blocks / ⌨️ Code', 'Switch between building with blocks and typing real JavaScript code.'],
  ['📖 Block Help', 'Shows what every block on this level does, with a small moving example.'],
  ['📘 Lesson', 'The lesson card for this world, with a code example.'],
  ['💡 Hint', 'Opens after 5 tries on a level. It tells you the plan.'],
  ['↶ Undo / ↷ Redo', 'Take back your last change, or bring it back again.'],
  ['⠿ (grip)', 'Hold and drag a block to move it. You can also drag blocks from the top.'],
  ['▲ ▼ ✕', 'Move a block up, down, or remove it.'],
  ['clear', 'Removes all blocks (tap twice to be sure).'],
  ['🚘 Car', 'Choose which car to drive on this level.'],
  ['🐣 Easy / 🏎️ Normal', 'Easy gives you more blocks, fewer 🎯 blocks to use and fewer test tracks. Change it any time, on a level or in My profile.'],
  ['🏁 Track 1 · 🧪 Track 2', 'Some levels have test tracks. Tap one to watch it. Your program must win on all of them.'],
  ['🟢 🟡 🔴', 'Level type: Warm-up, Challenge or Expert (the dot on each level bubble).'],
  ['🗺️ small track', 'When your program is long, a small track appears in the corner with its own GO button.'],
  ['🎵', 'Turns the background music on or off.'],
];

export function AppGuide({ onClose, sound }: { onClose: () => void; sound: boolean }) {
  const [tab, setTab] = useState(SECTIONS[0].id);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal guide app-guide" role="dialog" aria-label="How to play" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <h2>📚 How to Play</h2>
          <button className="btn ghost small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="garage-tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={s.id === tab ? 'on' : ''}
              onClick={() => {
                setTab(s.id);
                play('click', sound);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="guide-body">
          {tab === 'start' && (
            <>
              <h3>What is Turbo Coder?</h3>
              <p>
                You are the car's programmer! The car cannot think by itself. You give it a list of instructions, called a <b>program</b>, and the car follows it
                from top to bottom. Your job: get the car to the 🏁 flag.
              </p>
              <h3>How to play a level</h3>
              <ol>
                <li>Look at the track. Find the car 🚗 and the flag 🏁.</li>
                <li>Read Coach Gearheart's message and the 🎯 Must use line.</li>
                <li>Tap blocks at the top to add them to "My program" (or drag them).</li>
                <li>Press ▶ GO! and watch.</li>
                <li>If the car goes the wrong way, change your blocks and try again. Mistakes are how we learn!</li>
              </ol>
              <h3>The worlds</h3>
              <ul className="worlds">
                {CHAPTERS.map((c) => (
                  <li key={c.id}>
                    {c.emoji} <b>{c.name}</b>: {c.concept}
                  </li>
                ))}
              </ul>
              <p>Every level is open. The glowing bubble on the Map is the one we suggest next.</p>
            </>
          )}
          {tab === 'buttons' && (
            <table className="btn-table buttons">
              <tbody>
                {BUTTONS.map(([b, t]) => (
                  <tr key={b}>
                    <td>
                      <b>{b}</b>
                    </td>
                    <td>{t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'blocks' && <BlockExplorer types={ALL_BLOCKS} sound={sound} />}
          {tab === 'eyes' && <SensorTable />}
          {tab === 'code' && (
            <>
              <p>
                Every block is also real <b>JavaScript</b> code. Tap ⌨️ Code on any level to type instead of using blocks. Press "👀 See my blocks as real code" to see
                your blocks turned into code.
              </p>
              <table className="btn-table">
                <tbody>
                  {(
                    [
                      ['⬆️ Drive', 'forward();'],
                      ['↰ Turn left', 'left();'],
                      ['🔁 Repeat 3', 'for (let i = 0; i < 3; i++) { … }'],
                      ['🔄 While', 'while (!atFinish()) { … }'],
                      ['❓ If / else', 'if (roadAhead()) { … } else { … }'],
                      ['📦 Make box', 'let steps = 3;'],
                      ['➕ Change box', 'steps += 1;'],
                      ['🛠️ Function', 'function go(n) { … }'],
                      ['📞 Call', 'go(3);'],
                      ['📜 For each', 'for (const leg of legs) { … }'],
                      ['💬 Say', 'say("open");'],
                      ['🪧 On sign', 'onSign((sign) => { … });'],
                      ['🌀 Spin (fun)', 'spin();'],
                    ] as [string, string][]
                  ).map(([b, c]) => (
                    <tr key={b}>
                      <td>{b}</td>
                      <td>
                        <code>{c}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Tip: the chips above the code box type the code for you. Every command ends with ( ) and a ;</p>
            </>
          )}
          {tab === 'stars' && (
            <>
              <h3>⭐ How many stars?</h3>
              <ul>
                <li>⭐⭐⭐ Your program is as short as Coach's best answer, or shorter.</li>
                <li>⭐⭐ Your program is a little longer than Coach's best.</li>
                <li>⭐ Your program is close to the block limit.</li>
              </ul>
              <p>
                The numbers are shown under the track. Example: Coach's best is 5 and the limit is 8. Then 5 or less gets ⭐⭐⭐, 6 or 7 gets ⭐⭐, and 8 gets ⭐.
                More than 8 is not allowed.
              </p>
              <h3>🎯 Must use</h3>
              <p>
                Many levels teach one idea, like 🔁 Repeat. The 🎯 line tells you which block you MUST use. If you reach the flag without it, the level is not
                finished yet. Use the block and try again!
              </p>
              <p>
                The block must really do its job. An empty block does not count. A 🔁 Repeat, 🔄 While or 📜 For each must have at least one real block inside
                it, like Drive or Turn. Only 🎉 fun blocks inside is not enough.
              </p>
              <h3>📏 Block limit</h3>
              <p>
                Each level allows only a certain number of blocks (shown as "5 / 9 blocks"). This makes you think of smart, short programs with loops and
                functions. 🎉 Fun blocks are always free and never count.
              </p>
              <h3>🐣 Easy and 🏎️ Normal mode</h3>
              <p>You choose how many blocks you are allowed. Change it with the Mode buttons under the track, or in My profile.</p>
              <table className="btn-table">
                <tbody>
                  <tr>
                    <td>
                      <b>🐣 Easy</b>
                    </td>
                    <td>More room to try things: double the extra blocks of Normal mode (at least 6 extra). Example: best answer 4 → up to 10 blocks, best answer 20 → up to 28.</td>
                  </tr>
                  <tr>
                    <td>
                      <b>🏎️ Normal</b>
                    </td>
                    <td>Less room, more thinking: Coach's best answer plus a little more (at least 3 extra, or 20% on big tracks). Example: best answer 4 → up to 7 blocks, best answer 20 → up to 24.</td>
                  </tr>
                </tbody>
              </table>
              <p>
                ⭐⭐⭐ always needs Coach's best answer or shorter, in both modes. Easy mode has more room, so ⭐⭐ and ⭐ stretch a little further. Try to make
                your program short!
              </p>
              <table className="btn-table">
                <tbody>
                  <tr>
                    <td>
                      <b>What Easy changes</b>
                    </td>
                    <td>
                      More blocks allowed. Only the world's main 🎯 block is needed (Normal may need 2 or 3). Only 1 🧪 test track has to pass (Normal needs all).
                    </td>
                  </tr>
                </tbody>
              </table>
              <h3>🟢🟡🔴 Level types</h3>
              <p>Every world goes from easy to hard. Look for the coloured dot on each level bubble:</p>
              <ul>
                <li>
                  <b>🟢 Warm-up</b>: learn the new block. One 🎯 block to use.
                </li>
                <li>
                  <b>🟡 Challenge</b>: practise it. You may also need one block from an earlier world (like a 🔁 loop).
                </li>
                <li>
                  <b>🔴 Expert</b>: master it. Longer roads, and up to two earlier blocks to use together. The last level is the 👹 boss.
                </li>
              </ul>
              <h3>🧪 Test tracks</h3>
              <p>
                Some levels have more than one track: 🏁 Track 1, 🧪 Track 2, 🧪 Track 3. The road, the numbers or the password are a little different on each. Your
                SAME program must reach the flag on all of them.
              </p>
              <p>
                So you cannot just remember the road ("drive 3, turn left…"). Use the car's eyes (like roadAhead), boxes, lists and signs, so your program works
                on any track. Tap a track's tab to watch it, then press GO. ✅ means that track worked, ❌ means try again.
              </p>
              <h3>💡 Hints</h3>
              <p>The hint opens after 5 tries on a level. Try on your own first, you can do it!</p>
            </>
          )}
          {tab === 'rewards' && (
            <>
              <table className="btn-table">
                <tbody>
                  {(
                    [
                      ['🏁 First time you finish a level', `+${REWARDS.firstWinXp} XP, +${REWARDS.firstWinCoins} 🪙`],
                      ['⭐ Every new star', `+${REWARDS.starXp} XP`],
                      ['🪙 Every coin you pick up on the track', `+${REWARDS.trackCoinCoins} 🪙, +${REWARDS.trackCoinXp} XP`],
                      ['👑 Perfect Run (3 stars on your first GO)', `+${REWARDS.perfectXp} XP, +${REWARDS.perfectCoins} 🪙`],
                      ['👹 Beat a boss level (the last level of a world)', `+${REWARDS.bossXp} XP, +${REWARDS.bossCoins} 🪙`],
                      ['🌞 First win of the day', `+${REWARDS.dailyCoins(1)} 🪙 (more each day of your streak, up to +${REWARDS.dailyCoins(10)})`],
                      ['🌍 Finish every level in a world', `+${REWARDS.worldXp(30)} XP, +${REWARDS.worldCoins(30)} 🪙`],
                      ['🏅 Every new badge', `+${REWARDS.badgeCoins} 🪙`],
                    ] as [string, string][]
                  ).map(([a, b]) => (
                    <tr key={a}>
                      <td>{a}</td>
                      <td>
                        <b>{b}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>XP and driver level</h3>
              <p>
                XP fills the bar at the top. When it is full you go up one driver level. Every 4 levels you get a new title: {RANKS.join(' → ')}.
              </p>
              <h3>🔥 Streak</h3>
              <p>Win at least one level every day to grow your streak. A bigger streak gives a bigger daily bonus.</p>
            </>
          )}
          {tab === 'garage' && (
            <>
              <h3>🔧 Garage</h3>
              <p>
                Spend your 🪙 coins in the Garage: 16 cars, paints, patterns, stickers, roof toppers, wheels, glow, trails and horns. Tap an item to buy it and
                use it. "Track car" means each level gives you its own car for free.
              </p>
              <h3>🏅 Badges</h3>
              <p>Badges are special prizes for things like finishing worlds, collecting stars, Perfect Runs, coins, typing code and playing many days in a row.</p>
              <h3>💾 Saving</h3>
              <p>
                Your progress saves by itself on this device and browser, including half-done programs. Playing on another phone or computer starts fresh
                there.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
