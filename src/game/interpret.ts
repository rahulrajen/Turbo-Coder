import { type Block, type Clause, type Cond, type Expr, type Tok, getSlot } from './ast';
import { createSim, type Level, type RunResult } from './engine';

class Scope {
  vars = new Map<string, unknown>();
  consts = new Set<string>();
  constructor(readonly parent?: Scope) {}
  find(name: string): Scope | undefined {
    return this.vars.has(name) ? this : this.parent?.find(name);
  }
}

const PATH = /^([A-Za-z_]\w*)((?:\.\w+|\[\w+\])*)$/;

function resolvePath(scope: Scope, path: string): unknown {
  const m = PATH.exec(path);
  if (!m) throw new Error(`"${path}" is not a box name`);
  const holder = scope.find(m[1]);
  if (!holder) throw new Error(`I can't find a box called "${m[1]}". Make it first with a "Make" block!`);
  let value = holder.vars.get(m[1]) as never;
  for (const part of m[2].match(/\.\w+|\[\w+\]/g) ?? []) {
    const key = part[0] === '.' ? part.slice(1) : part.slice(1, -1);
    // legs[0] is a position, legs[i] looks up the box i, and stop.n is a plain property name
    const k = part[0] === '.' || /^\d+$/.test(key) ? (/^\d+$/.test(key) ? Number(key) : key) : (resolvePath(scope, key) as never);
    value = (value as Record<string, never>)?.[k as never];
  }
  return value;
}

function arith(op: string, a: unknown, b: unknown): unknown {
  const x = a as number;
  const y = b as number;
  switch (op) {
    case '+':
      return (x as never) + (y as never);
    case '-':
      return x - y;
    case '*':
      return x * y;
    case '/':
      return x / y;
    default:
      return x % y;
  }
}

function compare(op: string, a: unknown, b: unknown): boolean {
  switch (op) {
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '<':
      return (a as number) < (b as number);
    case '>':
      return (a as number) > (b as number);
    case '<=':
      return (a as number) <= (b as number);
    default:
      return (a as number) >= (b as number);
  }
}

export function runBlocks(level: Level, blocks: Block[]): RunResult {
  const sim = createSim(level);
  return sim.run((api) => {
    const globals = new Scope();
    for (const [k, v] of Object.entries(level.data)) {
      globals.vars.set(k, structuredClone(v));
      globals.consts.add(k);
    }
    const fns = new Map<string, Extract<Block, { type: 'function' }>>();
    for (const b of blocks) if (b.type === 'function') fns.set(b.name, b);
    let depth = 0;

    const tok = (t: Tok, s: Scope): unknown => {
      switch (t.k) {
        case 'num':
        case 'str':
          return t.v;
        case 'var':
          return resolvePath(s, t.name);
        case 'sense':
          return api[t.name]();
      }
    };
    const expr = (e: Expr, s: Scope) => (e.op && e.b ? arith(e.op, tok(e.a, s), tok(e.b, s)) : tok(e.a, s));
    const clause = (c: Clause, s: Scope) => {
      const v = c.op && c.b ? compare(c.op, tok(c.a, s), tok(c.b, s)) : Boolean(tok(c.a, s));
      return c.not ? !v : v;
    };
    const cond = (c: Cond, s: Scope) => (c.join === '&&' ? c.clauses.every((x) => clause(x, s)) : c.clauses.some((x) => clause(x, s)));

    const callFn = (name: string, args: unknown[]) => {
      const fn = fns.get(name);
      if (!fn) throw new Error(`There is no function called "${name}"`);
      if (++depth > 150) throw new RangeError('deep');
      const s = new Scope(globals);
      fn.params.forEach((p, i) => s.vars.set(p, args[i]));
      exec(fn.body, s);
      depth--;
    };

    const exec = (list: Block[], scope: Scope) => {
      for (const b of list) {
        api.tick();
        switch (b.type) {
          case 'forward':
          case 'left':
          case 'right':
          case 'honk':
          case 'spin':
          case 'jump':
          case 'dance':
          case 'flash':
          case 'sing':
            api[b.type]();
            break;
          case 'say':
            api.say(expr(b.e, scope));
            break;
          case 'repeat': {
            const n = Number(expr(b.n, scope));
            if (!Number.isFinite(n)) throw new Error('Repeat needs a number');
            for (let i = 0; i < n; i++) {
              api.tick(); // an empty Repeat 999999999 must still stop
              exec(b.body, new Scope(scope));
            }
            break;
          }
          case 'while':
            while (cond(b.cond, scope)) {
              api.tick();
              exec(b.body, new Scope(scope));
            }
            break;
          case 'if':
            if (cond(b.cond, scope)) exec(b.then, new Scope(scope));
            else if (b.els) exec(b.els, new Scope(scope));
            break;
          case 'let':
            scope.vars.set(b.name, expr(b.e, scope));
            break;
          case 'set':
          case 'change': {
            const holder = scope.find(b.name);
            if (!holder) throw new Error(`I can't find a box called "${b.name}". Make it first with a "Make" block!`);
            if (holder.consts.has(b.name)) throw new Error(`"${b.name}" is given to you and can't be changed. Make your own box instead!`);
            const v = expr(b.e, scope);
            holder.vars.set(b.name, b.type === 'set' ? v : arith('+', holder.vars.get(b.name), v));
            break;
          }
          case 'call':
            callFn(
              b.name,
              b.args.map((a) => expr(a, scope)),
            );
            break;
          case 'foreach': {
            const items = resolvePath(scope, b.list);
            if (!Array.isArray(items)) throw new Error(`"${b.list}" is not a list`);
            for (const item of items) {
              api.tick();
              const s = new Scope(scope);
              s.vars.set(b.item, item);
              s.consts.add(b.item); // `for (const item of list)` in JavaScript
              exec(b.body, s);
            }
            break;
          }
          case 'onsign':
            api.onSign((n) => {
              const s = new Scope(scope);
              s.vars.set(b.param, n);
              exec(getSlot(b, 'body'), s);
            });
            break;
          case 'function':
            break; // hoisted above
        }
      }
    };

    exec(blocks, globals);
  });
}
