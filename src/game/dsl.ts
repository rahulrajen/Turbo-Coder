// Tiny helpers for writing reference solutions as block programs.
import type { Arith, Block, Clause, Cmp, Cond, Expr, SenseName } from './ast';

let n = 0;
const id = () => `r${n++}`;
type Part = Block | Block[];
const flat = (parts: Part[]): Block[] => parts.flat();

export const F = (): Block => ({ id: id(), type: 'forward' });
export const L = (): Block => ({ id: id(), type: 'left' });
export const R = (): Block => ({ id: id(), type: 'right' });
export const honk = (): Block => ({ id: id(), type: 'honk' });

/** `k` forward blocks in a row (no loop). */
export const fx = (k: number): Block[] => Array.from({ length: k }, F);

// expressions
export const num = (v: number): Expr => ({ a: { k: 'num', v } });
export const str = (v: string): Expr => ({ a: { k: 'str', v } });
export const v = (name: string): Expr => ({ a: { k: 'var', name } });
export const sn = (name: SenseName): Expr => ({ a: { k: 'sense', name } });
export const bin = (a: Expr, op: Arith, b: Expr): Expr => ({ a: a.a, op, b: b.a });

// conditions
export const ok = (name: SenseName): Clause => ({ a: { k: 'sense', name } });
export const no = (name: SenseName): Clause => ({ not: true, a: { k: 'sense', name } });
export const cmp = (a: Expr, op: Cmp, b: Expr): Clause => ({ a: a.a, op, b: b.a });
export const all = (...clauses: Clause[]): Cond => ({ join: '&&', clauses });
export const any = (...clauses: Clause[]): Cond => ({ join: '||', clauses });

// statements
export const say = (e: Expr): Block => ({ id: id(), type: 'say', e });
export const rep = (count: number | Expr, ...body: Part[]): Block => ({
  id: id(),
  type: 'repeat',
  n: typeof count === 'number' ? num(count) : count,
  body: flat(body),
});
export const whl = (cond: Cond | Clause, ...body: Part[]): Block => ({
  id: id(),
  type: 'while',
  cond: 'clauses' in cond ? cond : all(cond),
  body: flat(body),
});
export const iff = (cond: Cond | Clause, then: Block[], els?: Block[]): Block => ({
  id: id(),
  type: 'if',
  cond: 'clauses' in cond ? cond : all(cond),
  then,
  els,
});
export const mk = (name: string, e: Expr): Block => ({ id: id(), type: 'let', name, e });
export const setv = (name: string, e: Expr): Block => ({ id: id(), type: 'set', name, e });
export const chg = (name: string, e: Expr): Block => ({ id: id(), type: 'change', name, e });
export const call = (name: string, ...args: Expr[]): Block => ({ id: id(), type: 'call', name, args });
export const fn = (name: string, params: string[], ...body: Part[]): Block => ({ id: id(), type: 'function', name, params, body: flat(body) });
export const each = (item: string, list: string, ...body: Part[]): Block => ({ id: id(), type: 'foreach', item, list, body: flat(body) });
export const onsign = (param: string, ...body: Part[]): Block => ({ id: id(), type: 'onsign', param, body: flat(body) });

/** drive around a cone that sits two squares ahead */
export const DODGE = (): Block[] => [F(), R(), F(), L(), F(), F(), L(), F(), R()];

/** while not finished: go forward, otherwise turn toward the road */
export const SMART = (): Block[] => [whl(no('atFinish'), iff(ok('roadAhead'), [F()], [iff(ok('roadLeft'), [L()], [R()])]))];
