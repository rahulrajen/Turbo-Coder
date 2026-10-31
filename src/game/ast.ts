// One program format shared by the block editor, the interpreter and the JavaScript generator.

export type SenseName =
  | 'roadAhead'
  | 'roadLeft'
  | 'roadRight'
  | 'atFinish'
  | 'coinAhead'
  | 'distanceAhead'
  | 'readSign';

export const SENSES: SenseName[] = ['roadAhead', 'roadLeft', 'roadRight', 'atFinish', 'coinAhead', 'distanceAhead', 'readSign'];

export type Tok =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'var'; name: string }
  | { k: 'sense'; name: SenseName };

export type Arith = '+' | '-' | '*' | '/' | '%';
export type Cmp = '==' | '!=' | '<' | '>' | '<=' | '>=';

export interface Expr {
  a: Tok;
  op?: Arith;
  b?: Tok;
}

export interface Clause {
  not?: boolean;
  a: Tok;
  op?: Cmp;
  b?: Tok;
}

export interface Cond {
  join: '&&' | '||';
  clauses: Clause[];
}

export type Block =
  | { id: string; type: 'forward' | 'left' | 'right' | 'honk' }
  | { id: string; type: 'say'; e: Expr }
  | { id: string; type: 'repeat'; n: Expr; body: Block[] }
  | { id: string; type: 'while'; cond: Cond; body: Block[] }
  | { id: string; type: 'if'; cond: Cond; then: Block[]; els?: Block[] }
  | { id: string; type: 'let' | 'set' | 'change'; name: string; e: Expr }
  | { id: string; type: 'call'; name: string; args: Expr[] }
  | { id: string; type: 'function'; name: string; params: string[]; body: Block[] }
  | { id: string; type: 'foreach'; item: string; list: string; body: Block[] }
  | { id: string; type: 'onsign'; param: string; body: Block[] };

export type BlockType = Block['type'];
export type Feature = 'repeat' | 'while' | 'if' | 'let' | 'function' | 'foreach' | 'onsign' | 'say';

// ---------- ids & construction ----------

let counter = 0;
export const newId = () => `b${Date.now().toString(36)}${counter++}`;

export interface MakeCtx {
  fns: { name: string; params: string[] }[];
  vars: string[];
  lists: string[];
}

const num = (v: number): Expr => ({ a: { k: 'num', v } });
const roadAheadCond = (): Cond => ({ join: '&&', clauses: [{ a: { k: 'sense', name: 'roadAhead' } }] });

function unique(base: string, taken: string[]) {
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(base + i)) i++;
  return base + i;
}

export function makeBlock(type: BlockType, ctx: MakeCtx): Block {
  const id = newId();
  switch (type) {
    case 'forward':
    case 'left':
    case 'right':
    case 'honk':
      return { id, type };
    case 'say':
      return { id, type, e: { a: { k: 'str', v: 'hello' } } };
    case 'repeat':
      return { id, type, n: num(3), body: [] };
    case 'while':
      return { id, type, cond: roadAheadCond(), body: [] };
    case 'if':
      return { id, type, cond: roadAheadCond(), then: [] };
    case 'let':
      return { id, type, name: unique('n', ctx.vars), e: num(3) };
    case 'set':
    case 'change':
      // the box made most recently is the one kids nearly always mean
      return { id, type, name: ctx.vars[ctx.vars.length - 1] ?? 'n', e: num(1) };
    case 'call': {
      const fn = ctx.fns[0];
      return { id, type, name: fn?.name ?? 'go', args: (fn?.params ?? []).map(() => num(1)) };
    }
    case 'function':
      return { id, type, name: unique('myMove', ctx.fns.map((f) => f.name)), params: [], body: [] };
    case 'foreach':
      return { id, type, item: 'item', list: ctx.lists[0] ?? 'items', body: [] };
    case 'onsign':
      return { id, type, param: 'sign', body: [] };
  }
}

// ---------- slots (the lists a block contains) ----------

export function slotKeys(b: Block): ('body' | 'then' | 'els')[] {
  switch (b.type) {
    case 'if':
      return b.els ? ['then', 'els'] : ['then'];
    case 'repeat':
    case 'while':
    case 'function':
    case 'foreach':
    case 'onsign':
      return ['body'];
    default:
      return [];
  }
}

export function getSlot(b: Block, key: string): Block[] {
  if (b.type === 'if') return key === 'els' ? (b.els ?? []) : b.then;
  return 'body' in b ? b.body : [];
}

function setSlot(b: Block, key: string, list: Block[]): Block {
  if (b.type === 'if') return key === 'els' ? { ...b, els: list } : { ...b, then: list };
  if ('body' in b) return { ...b, body: list };
  return b;
}

export const slotAddr = (id: string, key: string) => (key === 'body' ? id : `${id}:${key}`);

function mapChildren(b: Block, f: (l: Block[]) => Block[]): Block {
  return slotKeys(b).reduce((acc, k) => setSlot(acc, k, f(getSlot(acc, k))), b);
}

/** Edits the list at `addr` ('' = top level). */
export function editList(blocks: Block[], addr: string, fn: (l: Block[]) => Block[]): Block[] {
  if (addr === '') return fn(blocks);
  const [id, key = 'body'] = addr.split(':');
  return blocks.map((b) => (b.id === id ? setSlot(b, key, fn(getSlot(b, key))) : mapChildren(b, (l) => editList(l, addr, fn))));
}

export function patchBlock(blocks: Block[], id: string, patch: Record<string, unknown>): Block[] {
  return blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : mapChildren(b, (l) => patchBlock(l, id, patch))));
}

/** Where a block sits: the address of its list and its position in it. */
export function locate(blocks: Block[], id: string, addr = ''): { addr: string; index: number; block: Block } | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.id === id) return { addr, index: i, block: b };
    for (const k of slotKeys(b)) {
      const r = locate(getSlot(b, k), id, slotAddr(b.id, k));
      if (r) return r;
    }
  }
  return null;
}

export const insertAt = (blocks: Block[], addr: string, index: number, b: Block) =>
  editList(blocks, addr, (l) => [...l.slice(0, index), b, ...l.slice(index)]);

/** Can a dragged block (or a new one of `type`) be dropped into the list at `addr`? */
export function canDrop(blocks: Block[], addr: string, drag: { id?: string; type: BlockType }): boolean {
  if (drag.type === 'function' && addr !== '') return false; // functions live at the top level
  if (!drag.id || addr === '') return true;
  const found = locate(blocks, drag.id);
  if (!found) return false;
  // a block can't go inside itself
  return !allBlocks([found.block]).some((b) => b.id === addr.split(':')[0]);
}

/** Moves a block (with everything inside it) to position `index` of the list at `addr`. */
export function moveTo(blocks: Block[], id: string, addr: string, index: number): Block[] {
  const from = locate(blocks, id);
  if (!from || !canDrop(blocks, addr, { id, type: from.block.type })) return blocks;
  let idx = index;
  if (from.addr === addr && from.index < index) idx--; // removing it first shifts the rest up
  if (from.addr === addr && from.index === idx) return blocks;
  return insertAt(removeBlock(blocks, id), addr, idx, from.block);
}

/** Keeps every call to a function in step with its name and inputs after the function block is edited. */
export function syncCalls(blocks: Block[], oldName: string, name: string, params: string[]): Block[] {
  const fix = (list: Block[]): Block[] =>
    list.map((b) => {
      const kids = mapChildren(b, fix);
      if (kids.type !== 'call' || kids.name !== oldName) return kids;
      return { ...kids, name, args: params.map((_, i) => kids.args[i] ?? { a: { k: 'num', v: 1 } }) };
    });
  return fix(blocks);
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks.filter((b) => b.id !== id).map((b) => mapChildren(b, (l) => removeBlock(l, id)));
}

export function moveBlock(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  const i = blocks.findIndex((b) => b.id === id);
  if (i >= 0) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return blocks;
    const copy = [...blocks];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  }
  return blocks.map((b) => mapChildren(b, (l) => moveBlock(l, id, dir)));
}

export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + 1 + slotKeys(b).reduce((m, k) => m + countBlocks(getSlot(b, k)), 0), 0);
}

export function allBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => [b, ...slotKeys(b).flatMap((k) => allBlocks(getSlot(b, k)))]);
}

export function cloneBlocks(blocks: Block[]): Block[] {
  const fresh = (list: Block[]): Block[] =>
    list.map((b) => mapChildren({ ...b, id: newId() } as Block, fresh));
  return fresh(blocks);
}

// ---------- variables visible to a block ----------

export function dataNames(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    out.push(k);
    if (Array.isArray(v)) {
      out.push(`${k}.length`);
      v.slice(0, 6).forEach((_, i) => out.push(`${k}[${i}]`));
    } else if (v && typeof v === 'object') {
      Object.keys(v).forEach((p) => out.push(`${k}.${p}`));
    }
  }
  return out;
}

function itemPaths(item: string, list: string, data: Record<string, unknown>): string[] {
  const v = data[list];
  const first = Array.isArray(v) ? v[0] : undefined;
  return first && typeof first === 'object' ? [item, ...Object.keys(first).map((k) => `${item}.${k}`)] : [item];
}

export function visibleVars(blocks: Block[], targetId: string | null, data: Record<string, unknown>): string[] {
  const base = dataNames(data);
  const walk = (list: Block[], names: string[]): string[] | null => {
    const local = [...names];
    for (const b of list) {
      if (b.id === targetId) return local;
      for (const k of slotKeys(b)) {
        let inner = local;
        if (b.type === 'foreach') inner = [...local, ...itemPaths(b.item, b.list, data)];
        else if (b.type === 'function') inner = [...base, ...b.params];
        else if (b.type === 'onsign') inner = [...local, b.param];
        const r = walk(getSlot(b, k), inner);
        if (r) return r;
      }
      if (b.type === 'let') local.push(b.name);
    }
    return null;
  };
  const found = walk(blocks, base);
  if (found) return found;
  // no target (adding a new block): everything declared at top level
  const all = [...base];
  for (const b of blocks) if (b.type === 'let') all.push(b.name);
  return all;
}

/** Boxes a Set / Change block may write to: the kid's own boxes and function inputs, not given data or loop items. */
export function assignableVars(blocks: Block[], targetId: string | null, data: Record<string, unknown>): string[] {
  const fixed = new Set([...dataNames(data), ...allBlocks(blocks).flatMap((b) => (b.type === 'foreach' ? [b.item] : []))]);
  return visibleVars(blocks, targetId, data).filter((n) => /^[A-Za-z_]\w*$/.test(n) && !fixed.has(n));
}

const RESERVED = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield await static implements interface package private protected public arguments eval undefined NaN Infinity'.split(' '),
);
const API_NAMES = new Set(['forward', 'left', 'right', 'honk', 'say', 'onSign', 'tick', ...SENSES]);

/**
 * Finds names that would work in blocks but break the real JavaScript, and explains the problem kindly.
 * Returns null when every name is fine.
 */
export function checkNames(blocks: Block[], data: Record<string, unknown>): string | null {
  const given = new Set(Object.keys(data));
  const bad = (name: string, what: string): string | null => {
    if (!name) return `One of your ${what} has no name. Give it a name!`;
    if (!/^[A-Za-z_]\w*$/.test(name)) return `"${name}" can't be a name. Start with a letter and use only letters and numbers.`;
    if (RESERVED.has(name)) return `"${name}" is a special word in JavaScript, so it can't be a ${what.replace(/es$|s$/, '')} name. Try another!`;
    if (API_NAMES.has(name)) return `"${name}" is already a car command. Pick a different name!`;
    if (given.has(name)) return `"${name}" is already a box you were given. Pick a different name!`;
    return null;
  };
  const fnNames = new Set<string>();
  for (const b of blocks) {
    if (b.type !== 'function') continue;
    const e = bad(b.name, 'functions');
    if (e) return e;
    if (fnNames.has(b.name)) return `You made two functions called "${b.name}". Give one a new name!`;
    fnNames.add(b.name);
  }
  const walk = (list: Block[]): string | null => {
    const here = new Set<string>();
    for (const b of list) {
      if (b.type === 'let') {
        const e = bad(b.name, 'boxes');
        if (e) return e;
        if (here.has(b.name)) return `You made the box "${b.name}" twice in the same place. Use a "Set box" block to change it instead!`;
        if (fnNames.has(b.name)) return `"${b.name}" is already the name of a function. Give the box another name!`;
        here.add(b.name);
      }
      if (b.type === 'function') for (const p of b.params) if (bad(p, 'inputs')) return bad(p, 'inputs');
      if (b.type === 'foreach') {
        const e = bad(b.item, 'items');
        if (e) return e;
      }
      if (b.type === 'onsign') {
        const e = bad(b.param, 'sign names');
        if (e) return e;
      }
      for (const k of slotKeys(b)) {
        const r = walk(getSlot(b, k));
        if (r) return r;
      }
    }
    return null;
  };
  return walk(blocks);
}

export const listNames =(data: Record<string, unknown>) => Object.keys(data).filter((k) => Array.isArray(data[k]));

export function functionsOf(blocks: Block[]) {
  return blocks.flatMap((b) => (b.type === 'function' ? [{ name: b.name, params: b.params }] : []));
}

// ---------- JavaScript generation ----------

const JS_CMP: Record<Cmp, string> = { '==': '===', '!=': '!==', '<': '<', '>': '>', '<=': '<=', '>=': '>=' };

export function tokCode(t: Tok): string {
  switch (t.k) {
    case 'num':
      return String(t.v);
    case 'str':
      return JSON.stringify(t.v);
    case 'var':
      return t.name;
    case 'sense':
      return `${t.name}()`;
  }
}

export const exprCode = (e: Expr) => (e.op && e.b ? `${tokCode(e.a)} ${e.op} ${tokCode(e.b)}` : tokCode(e.a));

function clauseCode(c: Clause) {
  const body = c.op && c.b ? `${tokCode(c.a)} ${JS_CMP[c.op]} ${tokCode(c.b)}` : tokCode(c.a);
  if (!c.not) return body;
  return c.op ? `!(${body})` : `!${body}`;
}

export const condCode = (c: Cond) => c.clauses.map(clauseCode).join(c.join === '&&' ? ' && ' : ' || ');

/** Every name the program itself makes or uses, so loop counters never clash with the kid's boxes. */
function namesIn(blocks: Block[]): Set<string> {
  const out = new Set<string>();
  const tok = (t: Tok) => t.k === 'var' && out.add(t.name.split(/[.[]/)[0]);
  const expr = (e: Expr) => (tok(e.a), e.b && tok(e.b));
  const cond = (c: Cond) => c.clauses.forEach((x) => (tok(x.a), x.b && tok(x.b)));
  for (const b of allBlocks(blocks)) {
    if ('name' in b) out.add(b.name);
    if (b.type === 'function') b.params.forEach((p) => out.add(p));
    if (b.type === 'foreach') out.add(b.item);
    if (b.type === 'onsign') out.add(b.param);
    if ('e' in b) expr(b.e);
    if (b.type === 'repeat') expr(b.n);
    if (b.type === 'call') b.args.forEach(expr);
    if (b.type === 'while' || b.type === 'if') cond(b.cond);
  }
  return out;
}

export function toCode(blocks: Block[], indent = 0, depth = 0, counters?: string[]): string {
  if (!counters) {
    const used = namesIn(blocks);
    counters = ['i', 'j', 'k', 'm', 'p', 'q', 'r', 's', 't', 'u'].filter((c) => !used.has(c) && !used.has(`${c}Max`));
    if (counters.length === 0) counters = ['loopI'];
  }
  const ctr = counters;
  const pad = '  '.repeat(indent);
  const inner = (l: Block[], d = depth) => toCode(l, indent + 1, d, ctr);
  return blocks
    .map((b): string => {
      switch (b.type) {
        case 'forward':
        case 'left':
        case 'right':
        case 'honk':
          return `${pad}${b.type}();\n`;
        case 'say':
          return `${pad}say(${exprCode(b.e)});\n`;
        case 'repeat': {
          const c = ctr[depth] ?? `${ctr[0]}${depth}`;
          const simple = !b.n.op && b.n.a.k === 'num';
          const head = simple
            ? `for (let ${c} = 0; ${c} < ${exprCode(b.n)}; ${c}++) {`
            : `for (let ${c} = 0, ${c}Max = ${exprCode(b.n)}; ${c} < ${c}Max; ${c}++) {`;
          return `${pad}${head}\n${inner(b.body, depth + 1)}${pad}}\n`;
        }
        case 'while':
          return `${pad}while (${condCode(b.cond)}) {\n${inner(b.body)}${pad}}\n`;
        case 'if': {
          const els = b.els ? ` else {\n${inner(b.els)}${pad}}` : '';
          return `${pad}if (${condCode(b.cond)}) {\n${inner(b.then)}${pad}}${els}\n`;
        }
        case 'let':
          return `${pad}let ${b.name} = ${exprCode(b.e)};\n`;
        case 'set':
          return `${pad}${b.name} = ${exprCode(b.e)};\n`;
        case 'change':
          return `${pad}${b.name} += ${exprCode(b.e)};\n`;
        case 'call':
          return `${pad}${b.name}(${b.args.map(exprCode).join(', ')});\n`;
        case 'function':
          return `${pad}function ${b.name}(${b.params.join(', ')}) {\n${inner(b.body)}${pad}}\n`;
        case 'foreach':
          return `${pad}for (const ${b.item} of ${b.list}) {\n${inner(b.body)}${pad}}\n`;
        case 'onsign':
          return `${pad}onSign((${b.param}) => {\n${inner(b.body)}${pad}});\n`;
      }
    })
    .join('');
}

/** Code with comments and the insides of strings removed, so counting and pattern checks only see real code. */
function bareCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g, '""');
}

/**
 * How long a typed program is. Counts real lines (not blank, not just closing brackets) AND statements
 * (keywords plus semicolons outside brackets) and takes the bigger one, so squashing a program onto
 * one line, or leaving out semicolons, doesn't make it look shorter.
 */
export function countCodeLines(code: string): number {
  const src = bareCode(code);
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[}\]);]+$/.test(l)).length;
  // count `;` unless it sits directly inside ( ), like the two in a for-loop header
  const stack: string[] = [];
  let semis = 0;
  for (const ch of src) {
    if (ch === '(' || ch === '{') stack.push(ch);
    else if (ch === ')' || ch === '}') stack.pop();
    else if (ch === ';' && stack[stack.length - 1] !== '(') semis++;
  }
  const keywords = (src.match(/\b(if|else|for|while|do|function|switch)\b|=>/g) ?? []).length;
  // `});` closing an onSign handler is a semicolon but not a statement of its own
  const closers = (src.match(/\}\s*\)\s*;/g) ?? []).length;
  return Math.max(lines, keywords + semis - closers);
}

// ---------- which ideas a program uses (for the concept star) ----------

export function featuresOfBlocks(blocks: Block[]): Set<Feature> {
  const out = new Set<Feature>();
  for (const b of allBlocks(blocks)) {
    if (b.type === 'repeat' || b.type === 'while' || b.type === 'if' || b.type === 'foreach' || b.type === 'onsign' || b.type === 'say') out.add(b.type);
    else if (b.type === 'let' || b.type === 'set' || b.type === 'change') out.add('let');
    else if (b.type === 'function' || b.type === 'call') out.add('function');
  }
  return out;
}

export function featuresOfCode(code: string): Set<Feature> {
  const src = bareCode(code);
  const out = new Set<Feature>();
  if (/\bfor\s*\((?![^)]*\bof\b)/.test(src)) out.add('repeat');
  if (/\bfor\s*\([^)]*\bof\b/.test(src)) out.add('foreach');
  if (/\bwhile\s*\(/.test(src)) out.add('while');
  if (/\bif\s*\(/.test(src)) out.add('if');
  // a loop's own counter (`for (let i = 0; …`) is not "making a variable"
  if (/\b(let|const|var)\s+\w+\s*=/.test(src.replace(/\bfor\s*\(\s*(let|const|var)\b/g, 'for ('))) out.add('let');
  // the arrow handed to onSign is an event handler, not "making a function"
  if (/\bfunction\b|=>/.test(src.replace(/\bonSign\s*\(\s*\(?\s*\w*\s*\)?\s*=>/g, 'onSign('))) out.add('function');
  if (/\bonSign\s*\(/.test(src)) out.add('onsign');
  if (/\bsay\s*\(/.test(src)) out.add('say');
  return out;
}
