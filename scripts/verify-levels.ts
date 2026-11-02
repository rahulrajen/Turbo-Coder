// Checks every level: the reference solution must win both as blocks and as generated JavaScript,
// the buggy starter programs must NOT win, and the reference must use the concept the level teaches.
import { LEVELS } from '../src/game/levels';
import { type Level, createSim, dataPrelude, onTrack } from '../src/game/engine';
import { runBlocks } from '../src/game/interpret';
import { type Block, allBlocks, checkNames, countBlocks, countCodeLines, featuresOfBlocks, featuresOfCode, toCode } from '../src/game/ast';
import { blockLimit, lineLimit } from '../src/game/rules';

/** The exact steps the solution made on the main track, as plain blocks: what a kid who "memorises the road" would build. */
function memorised(level: Level): Block[] {
  const frames = runBlocks(level, level.ref).frames;
  const out: Block[] = [];
  let id = 0;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i];
    if (f.event === 'move') out.push({ id: `m${id++}`, type: 'forward' });
    else if (f.event === 'turn') out.push({ id: `m${id++}`, type: f.rot > frames[i - 1].rot ? 'right' : 'left' });
    else if (f.event === 'say') out.push({ id: `m${id++}`, type: 'say', e: { a: { k: 'str', v: f.text ?? '' } } });
  }
  return out;
}

let bad = 0;
const fail = (id: number, msg: string) => {
  bad++;
  console.log(`FAIL L${id}: ${msg}`);
};

for (const level of LEVELS) {
  const blocksRes = runBlocks(level, level.ref);
  if (blocksRes.outcome !== 'finish') fail(level.id, `blocks ${blocksRes.outcome} ${blocksRes.error ?? ''}`);

  const code = toCode(level.ref);
  const sim = createSim(level);
  const names = Object.keys(sim.api).filter((n) => n !== 'tick');
  const textRes = sim.run(() => new Function(...names, `"use strict";\n${dataPrelude(level.data)}\n${code}`)(...names.map((n) => sim.api[n as keyof typeof sim.api])));
  if (textRes.outcome !== 'finish') fail(level.id, `code ${textRes.outcome} ${textRes.error ?? ''}\n${code}`);
  if (textRes.coins !== blocksRes.coins) fail(level.id, `coins differ blocks=${blocksRes.coins} code=${textRes.coins}`);

  if (level.starter) {
    const s = runBlocks(level, level.starter);
    if (s.outcome === 'finish') fail(level.id, 'starter already wins (no bug to fix)');
  }

  // the solution must be buildable with ONLY the blocks this level offers, inside its block limit
  for (const b of allBlocks(level.ref)) if (!level.tools.includes(b.type)) fail(level.id, `solution needs the "${b.type}" block, which this level doesn't offer`);
  if (level.par.blocks > blockLimit(level)) fail(level.id, `solution has ${level.par.blocks} blocks, over the limit ${blockLimit(level)}`);
  if (blockLimit(level, true) < blockLimit(level) || lineLimit(level, true) < lineLimit(level)) fail(level.id, 'Easy mode allows fewer blocks than Normal');
  if (level.par.lines > lineLimit(level)) fail(level.id, `solution has ${level.par.lines} lines, over the limit ${lineLimit(level)}`);
  // every "must use" idea needs its block on offer
  const NEEDS: Record<string, string[]> = { repeat: ['repeat'], while: ['while'], if: ['if'], let: ['let'], function: ['function'], foreach: ['foreach'], onsign: ['onsign'], say: ['say'], loop: ['repeat', 'while', 'foreach'] };
  for (const f of level.use) if (!NEEDS[f].some((t) => level.tools.includes(t as never))) fail(level.id, `must use "${f}" but that block isn't offered`);

  // test tracks: the model solution must win on every one (as blocks AND as code)...
  level.tests.forEach((_, i) => {
    const t = onTrack(level, i + 1);
    if (runBlocks(t, level.ref).outcome !== 'finish') fail(level.id, `solution fails test track ${i + 2}`);
    const s = createSim(t);
    const r = s.run(() => new Function(...names, `"use strict";\n${dataPrelude(t.data)}\n${code}`)(...names.map((n) => s.api[n as keyof typeof s.api])));
    if (r.outcome !== 'finish') fail(level.id, `solution as code fails test track ${i + 2}`);
  });
  // ...and they must really test something: a program that just memorises the main road
  // (the exact Drive / Turn / Say steps the solution made) must fail at least one of them
  if (level.tests.length) {
    const plain = memorised(level);
    if (runBlocks(level, plain).outcome !== 'finish') fail(level.id, 'could not build the memorised program');
    if (level.tests.every((_, i) => runBlocks(onTrack(level, i + 1), plain).outcome === 'finish')) fail(level.id, 'test tracks do not catch a memorised program');
  }
  // a bug-fix level must start within the limit, so the kid can fix it without deleting first
  if (level.starter && countBlocks(level.starter) > blockLimit(level)) fail(level.id, 'starter program is over the block limit');
  // any lists or boxes the solution reads must be given on the level
  for (const b of allBlocks(level.ref)) if (b.type === 'foreach' && !(b.list in level.data)) fail(level.id, `list "${b.list}" is not given`);

  const nameErr = checkNames(level.ref, level.data);
  if (nameErr) fail(level.id, `ref has a bad name: ${nameErr}`);
  // squashing the program onto one line must not make it count as shorter
  const squashed = countCodeLines(code.replace(/\n\s*/g, ' '));
  if (squashed < level.par.lines) fail(level.id, `one-line version counts ${squashed} < par ${level.par.lines}`);

  const fb = featuresOfBlocks(level.ref);
  const ft = featuresOfCode(code);
  for (const f of level.use) {
    if (!fb.has(f)) fail(level.id, `ref blocks do not use "${f}"`);
    if (!ft.has(f)) fail(level.id, `ref code does not use "${f}"`);
  }
}

console.log(`${LEVELS.length} levels checked, ${bad} problems`);
const tiers = (t: string) => LEVELS.filter((l) => l.tier === t).length;
console.log(`tiers: ${tiers('warmup')} warm-up, ${tiers('challenge')} challenge, ${tiers('expert')} expert`);
console.log(`test tracks: ${LEVELS.filter((l) => l.tests.length).length} levels have them (${LEVELS.reduce((n, l) => n + l.tests.length, 0)} tracks)`);
console.log(`must use 2+ ideas: ${LEVELS.filter((l) => l.use.length >= 2).length} levels; 3+: ${LEVELS.filter((l) => l.use.length >= 3).length}`);
if (bad) throw new Error(`${bad} problem(s)`);
