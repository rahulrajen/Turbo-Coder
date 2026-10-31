// Checks every level: the reference solution must win both as blocks and as generated JavaScript,
// the buggy starter programs must NOT win, and the reference must use the concept the level teaches.
import { LEVELS } from '../src/game/levels';
import { createSim, dataPrelude } from '../src/game/engine';
import { runBlocks } from '../src/game/interpret';
import { checkNames, countCodeLines, featuresOfBlocks, featuresOfCode, toCode } from '../src/game/ast';

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
console.log(LEVELS.map((l) => `${l.id}:${l.par.blocks}/${l.par.lines}`).join(' '));
if (bad) throw new Error(`${bad} problem(s)`);
