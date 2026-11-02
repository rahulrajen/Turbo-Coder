import { useRef, useState } from 'react';
import { META } from '../game/blockMeta';
import {
  type Arith, type Block, type BlockType, type Clause, type Cmp, type Cond, type Expr, type MakeCtx, type SenseName, type Tok,
  SENSES, allBlocks, assignableVars, canDrop, countBlocks, insertAt, isFun, moveTo, syncCalls, editList, functionsOf, getSlot, listNames, makeBlock, moveBlock, patchBlock, removeBlock, slotAddr, slotKeys, visibleVars,
} from '../game/ast';

interface Props {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  tools: BlockType[];
  data: Record<string, unknown>;
  active: string; // address of the list new blocks go into ('' = top level)
  onActive: (addr: string) => void;
  locked: boolean;
  onTap: () => void;
  /** most (non-fun) blocks allowed on this level */
  limit?: number;
  /** extra words for the limit note, e.g. "try Easy mode" */
  limitTip?: string;
}


const ARITH: [Arith | '', string][] = [['', '·'], ['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷'], ['%', 'mod']];
const CMP: [Cmp | '', string][] = [['', 'is true'], ['==', '='], ['!=', '≠'], ['<', '<'], ['>', '>'], ['<=', '≤'], ['>=', '≥']];

const ident = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '').replace(/^[0-9]+/, '');
const simple = (n: string) => /^[A-Za-z_]\w*$/.test(n);

// ---------- small editors for values and conditions ----------

function TokEdit({ tok, vars, onChange, locked }: { tok: Tok; vars: string[]; onChange: (t: Tok) => void; locked: boolean }) {
  const value = tok.k === 'num' ? 'num' : tok.k === 'str' ? 'str' : tok.k === 'var' ? `v:${tok.name}` : `s:${tok.name}`;
  const names = tok.k === 'var' && !vars.includes(tok.name) ? [tok.name, ...vars] : vars;
  return (
    <span className="tok">
      <select
        className={`kind ${tok.k}`}
        title="Change to a number, word, box or sensor"
        value={value}
        disabled={locked}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'num') onChange({ k: 'num', v: tok.k === 'num' ? tok.v : 1 });
          else if (val === 'str') onChange({ k: 'str', v: tok.k === 'str' ? tok.v : 'hi' });
          else if (val.startsWith('v:')) onChange({ k: 'var', name: val.slice(2) });
          else onChange({ k: 'sense', name: val.slice(2) as SenseName });
        }}
      >
        <option value="num">123</option>
        <option value="str">abc</option>
        {names.length > 0 && (
          <optgroup label="boxes">
            {names.map((n) => (
              <option key={n} value={`v:${n}`}>
                {n}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="sensors">
          {SENSES.map((s) => (
            <option key={s} value={`s:${s}`}>
              {s}()
            </option>
          ))}
        </optgroup>
      </select>
      {tok.k === 'num' && (
        <input className="num" type="number" disabled={locked} value={Number.isFinite(tok.v) ? tok.v : 0} onChange={(e) => onChange({ k: 'num', v: Number(e.target.value) })} />
      )}
      {tok.k === 'str' && <input {...TYPING} className="txt" type="text" disabled={locked} value={tok.v} onChange={(e) => onChange({ k: 'str', v: e.target.value })} />}
    </span>
  );
}

function ExprEdit({ e, vars, onChange, locked }: { e: Expr; vars: string[]; onChange: (e: Expr) => void; locked: boolean }) {
  return (
    <span className="expr">
      <TokEdit tok={e.a} vars={vars} locked={locked} onChange={(a) => onChange({ ...e, a })} />
      <select
        className="op"
        value={e.op ?? ''}
        disabled={locked}
        onChange={(ev) => {
          const op = ev.target.value as Arith | '';
          onChange(op ? { a: e.a, op, b: e.b ?? { k: 'num', v: 1 } } : { a: e.a });
        }}
      >
        {ARITH.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {e.op && e.b && <TokEdit tok={e.b} vars={vars} locked={locked} onChange={(b) => onChange({ ...e, b })} />}
    </span>
  );
}

function CondEdit({ cond, vars, onChange, locked }: { cond: Cond; vars: string[]; onChange: (c: Cond) => void; locked: boolean }) {
  const setClause = (i: number, c: Clause) => onChange({ ...cond, clauses: cond.clauses.map((x, j) => (j === i ? c : x)) });
  return (
    <span className="cond">
      {cond.clauses.map((c, i) => (
        <span className="clause" key={i}>
          {i > 0 && (
            <button className="join" disabled={locked} onClick={() => onChange({ ...cond, join: cond.join === '&&' ? '||' : '&&' })}>
              {cond.join === '&&' ? 'AND' : 'OR'}
            </button>
          )}
          <button className={`not ${c.not ? 'on' : ''}`} disabled={locked} onClick={() => setClause(i, { ...c, not: !c.not })}>
            NOT
          </button>
          <TokEdit tok={c.a} vars={vars} locked={locked} onChange={(a) => setClause(i, { ...c, a })} />
          <select
            className="op"
            value={c.op ?? ''}
            disabled={locked}
            onChange={(ev) => {
              const op = ev.target.value as Cmp | '';
              setClause(i, op ? { not: c.not, a: c.a, op, b: c.b ?? { k: 'num', v: 0 } } : { not: c.not, a: c.a });
            }}
          >
            {CMP.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {c.op && c.b && <TokEdit tok={c.b} vars={vars} locked={locked} onChange={(b) => setClause(i, { ...c, b })} />}
          {cond.clauses.length > 1 && (
            <button className="mini" disabled={locked} aria-label="remove condition" onClick={() => onChange({ ...cond, clauses: cond.clauses.filter((_, j) => j !== i) })}>
              ✕
            </button>
          )}
        </span>
      ))}
      {cond.clauses.length < 3 && (
        <button className="mini add" disabled={locked} aria-label="add condition" onClick={() => onChange({ ...cond, clauses: [...cond.clauses, { a: { k: 'sense', name: 'roadAhead' } }] })}>
          ＋
        </button>
      )}
    </span>
  );
}

/** Stops phones and tablets from capitalising or "correcting" names and secret words. */
const TYPING = { autoCapitalize: 'off', autoCorrect: 'off', autoComplete: 'off', spellCheck: false } as const;

/** Function inputs typed as "a, b". Keeps the raw text so a half-typed comma isn't eaten. */
function ParamsInput({ params, locked, onChange }: { params: string[]; locked: boolean; onChange: (p: string[]) => void }) {
  const [raw, setRaw] = useState(params.join(', '));
  return (
    <input
      {...TYPING}
      className="txt name"
      disabled={locked}
      placeholder="none"
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(e.target.value.split(',').map(ident).filter(Boolean));
      }}
    />
  );
}

// ---------- the editor ----------

export function BlockEditor({ blocks, onChange, tools, data, active, onActive, locked, onTap, limit = Infinity, limitTip = '' }: Props) {
  const byId = new Map(allBlocks(blocks).map((b) => [b.id, b]));
  const [activeId, activeKey] = active.split(':');
  const activeBlock = byId.get(activeId);
  // fall back to the top level if the target block (or its else) was removed
  const act = active === '' || (activeBlock && (activeKey !== 'els' || (activeBlock.type === 'if' && activeBlock.els))) ? active : '';
  const patch = (id: string, p: Record<string, unknown>) => onChange(patchBlock(blocks, id, p));
  const hasFunction = functionsOf(blocks).length > 0;
  const used = countBlocks(blocks);
  // at the limit only fun blocks (which are free) can still be added
  const full = (type: BlockType) => !isFun(type) && used >= limit;
  const [limitNote, setLimitNote] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const newBlock = (type: BlockType) =>
    makeBlock(type, { fns: functionsOf(blocks), vars: assignableVars(blocks, null, data), lists: listNames(data) } satisfies MakeCtx);

  const placed = (nb: Block, addr: string) => {
    const first = slotKeys(nb)[0];
    onActive(first ? slotAddr(nb.id, first) : addr);
  };

  const add = (type: BlockType) => {
    if (locked) return;
    if (draggedRef.current) {
      draggedRef.current = false; // this tap was the end of a drag, not a tap
      return;
    }
    if (full(type)) {
      setLimitNote(true);
      return;
    }
    onTap();
    const nb = newBlock(type);
    const target = type === 'function' ? '' : act;
    onChange(editList(blocks, target, (l) => [...l, nb]));
    placed(nb, target);
  };

  // ---------- drag and drop (pointer events, so it works with a finger, a mouse or a pen) ----------

  interface Drag {
    id?: string; // moving an existing block; absent = a new block from the palette
    type: BlockType;
  }
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState<{ addr: string; index: number } | null>(null);
  const draggedRef = useRef(false);
  const live = useRef({ blocks, drag, onChange, onActive, newBlock, placed, full });
  live.current = { blocks, drag, onChange, onActive, newBlock, placed, full };

  /** Which list position is under the finger: a drop line, a "tap to add" slot, or the top/bottom half of a block. */
  const targetAt = (x: number, y: number): { addr: string; index: number } | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const { blocks: bs, drag: d } = live.current;
    if (!el || !d) return null;
    let t: { addr: string; index: number } | null = null;
    const zone = el.closest<HTMLElement>('[data-drop]');
    const blk = el.closest<HTMLElement>('[data-bid]');
    if (zone) {
      const [addr, i] = zone.dataset.drop!.split('|');
      t = { addr, index: Number(i) };
    } else if (blk) {
      const head = blk.querySelector<HTMLElement>(':scope > .block-head') ?? blk;
      const r = head.getBoundingClientRect();
      t = { addr: blk.dataset.addr!, index: Number(blk.dataset.index) + (y > r.top + r.height / 2 ? 1 : 0) };
    } else if (el.closest('.program')) {
      t = { addr: '', index: bs.length };
    }
    return t && canDrop(bs, t.addr, d) ? t : null;
  };

  const startDrag = (d: Drag, x: number, y: number) => {
    draggedRef.current = true;
    setDrag(d);
    live.current.drag = d;
    setGhost({ x, y });
    setOver(null);
    navigator.vibrate?.(12);
    const move = (ev: PointerEvent) => {
      setGhost({ x: ev.clientX, y: ev.clientY });
      setOver(targetAt(ev.clientX, ev.clientY));
      // scroll the page when dragging near the top or bottom edge
      if (ev.clientY < 70) window.scrollBy(0, -14);
      else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
    };
    const finish = (ev: PointerEvent | null) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      document.removeEventListener('touchmove', noScroll);
      const t = ev ? targetAt(ev.clientX, ev.clientY) : null;
      const L = live.current;
      if (t && L.drag) {
        if (L.drag.id) L.onChange(moveTo(L.blocks, L.drag.id, t.addr, t.index));
        else if (L.full(L.drag.type)) setLimitNote(true);
        else {
          const nb = L.newBlock(L.drag.type);
          L.onChange(insertAt(L.blocks, t.addr, t.index, nb));
          L.placed(nb, t.addr);
        }
        onTap();
      }
      setDrag(null);
      setGhost(null);
      setOver(null);
      // let the click that follows a mouse drag be ignored, then forget it
      window.setTimeout(() => (draggedRef.current = false), 0);
    };
    const up = (ev: PointerEvent) => finish(ev);
    const cancel = () => finish(null);
    const noScroll = (ev: TouchEvent) => ev.preventDefault();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    document.addEventListener('touchmove', noScroll, { passive: false });
  };

  /**
   * Starts a drag only once the press clearly means "drag": a mouse that moves a little,
   * or a finger held still for a moment (a quick swipe still scrolls the page).
   */
  const armDrag = (e: React.PointerEvent, d: Drag) => {
    if (locked || e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const touch = e.pointerType === 'touch';
    let timer: number | undefined;
    const disarm = () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', armMove);
      window.removeEventListener('pointerup', disarm);
      window.removeEventListener('pointercancel', disarm);
    };
    const armMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy);
      if (touch && dist > 10) disarm(); // the finger is scrolling
      else if (!touch && dist > 6) {
        disarm();
        startDrag(d, ev.clientX, ev.clientY);
      }
    };
    if (touch) timer = window.setTimeout(() => (disarm(), startDrag(d, sx, sy)), 250);
    window.addEventListener('pointermove', armMove);
    window.addEventListener('pointerup', disarm);
    window.addEventListener('pointercancel', disarm);
  };

  const isOver = (addr: string, index: number) => !!over && over.addr === addr && over.index === index;

  const dropLine = (addr: string, index: number) =>
    drag && canDrop(blocks, addr, drag) ? (
      <div key={`drop-${addr}-${index}`} className={`dropline ${isOver(addr, index) ? 'over' : ''}`} data-drop={`${addr}|${index}`} />
    ) : null;

  const del = (id: string) => {
    if (locked) return;
    onTap();
    onChange(removeBlock(blocks, id));
  };

  const renderSlot = (b: Block, key: 'body' | 'then' | 'els', label?: string) => {
    const addr = slotAddr(b.id, key);
    const on = act === addr;
    return (
      <div key={key} className="block-body">
        {label && <div className="slot-label">{label}</div>}
        {renderList(getSlot(b, key), addr)}
        <div className={`slot ${on ? 'on' : ''} ${isOver(addr, getSlot(b, key).length) ? 'drop-over' : ''}`} data-drop={`${addr}|${getSlot(b, key).length}`} onClick={() => !locked && onActive(addr)}>
          {on ? '⬇ new blocks go here' : 'tap to add blocks here'}
        </div>
      </div>
    );
  };

  const renderList = (list: Block[], addr: string): React.ReactNode[] =>
    list.flatMap((b, index) => [dropLine(addr, index), renderBlock(b, addr, index)]).concat(list.length ? [dropLine(addr, list.length)] : []);

  const renderBlock = (b: Block, addr: string, index: number) => {
    {
      const m = META[b.type];
      const vars = visibleVars(blocks, b.id, data);
      const fieldProps = { vars, locked };
      const container = slotKeys(b).length > 0;
      const isActiveHead = container && act.split(':')[0] === b.id;

      let fields: React.ReactNode = null;
      switch (b.type) {
        case 'say':
          fields = <ExprEdit e={b.e} {...fieldProps} onChange={(e) => patch(b.id, { e })} />;
          break;
        case 'repeat':
          fields = (
            <>
              <ExprEdit e={b.n} {...fieldProps} onChange={(n) => patch(b.id, { n })} />
              <small className="lbl">times</small>
            </>
          );
          break;
        case 'while':
        case 'if':
          fields = <CondEdit cond={b.cond} {...fieldProps} onChange={(cond) => patch(b.id, { cond })} />;
          break;
        case 'let':
          fields = (
            <>
              <input {...TYPING} className="txt name" disabled={locked} value={b.name} onChange={(e) => patch(b.id, { name: ident(e.target.value) })} />
              <small className="lbl">=</small>
              <ExprEdit e={b.e} {...fieldProps} onChange={(e) => patch(b.id, { e })} />
            </>
          );
          break;
        case 'set':
        case 'change': {
          const own = assignableVars(blocks, b.id, data);
          const names = own.includes(b.name) ? own : [b.name, ...own];
          fields = (
            <>
              <select className="name" disabled={locked} value={b.name} onChange={(e) => patch(b.id, { name: e.target.value })}>
                {names.filter(simple).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <small className="lbl">{b.type === 'set' ? 'to' : 'by'}</small>
              <ExprEdit e={b.e} {...fieldProps} onChange={(e) => patch(b.id, { e })} />
            </>
          );
          break;
        }
        case 'call': {
          const fns = functionsOf(blocks);
          const fnDef = fns.find((f) => f.name === b.name);
          const names = fnDef ? fns.map((f) => f.name) : [b.name, ...fns.map((f) => f.name)];
          fields = (
            <>
              <select
                className="name"
                disabled={locked}
                value={b.name}
                onChange={(e) => {
                  const f = fns.find((x) => x.name === e.target.value);
                  patch(b.id, { name: e.target.value, args: (f?.params ?? []).map((_, i) => b.args[i] ?? { a: { k: 'num', v: 1 } }) });
                }}
              >
                {names.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              {b.args.map((a, i) => (
                <ExprEdit key={i} e={a} {...fieldProps} onChange={(e) => patch(b.id, { args: b.args.map((x, j) => (j === i ? e : x)) })} />
              ))}
            </>
          );
          break;
        }
        case 'function':
          fields = (
            <>
              <input
                {...TYPING}
                className="txt name"
                disabled={locked}
                value={b.name}
                onChange={(e) => {
                  const name = ident(e.target.value);
                  onChange(syncCalls(patchBlock(blocks, b.id, { name }), b.name, name, b.params));
                }}
              />
              <small className="lbl">inputs:</small>
              <ParamsInput params={b.params} locked={locked} onChange={(params) => onChange(syncCalls(patchBlock(blocks, b.id, { params }), b.name, b.name, params))} />
            </>
          );
          break;
        case 'foreach': {
          const lists = listNames(data);
          fields = (
            <>
              <input {...TYPING} className="txt name" disabled={locked} value={b.item} onChange={(e) => patch(b.id, { item: ident(e.target.value) })} />
              <small className="lbl">in</small>
              <select className="name" disabled={locked} value={b.list} onChange={(e) => patch(b.id, { list: e.target.value })}>
                {(lists.includes(b.list) ? lists : [b.list, ...lists]).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </>
          );
          break;
        }
        case 'onsign':
          fields = <input {...TYPING} className="txt name" disabled={locked} value={b.param} onChange={(e) => patch(b.id, { param: ident(e.target.value) })} aria-label="sign number name" />;
          break;
      }

      return (
        <div
          key={b.id}
          className={`block ${m.cls} ${isActiveHead ? 'active' : ''} ${drag?.id === b.id ? 'dragging' : ''}`}
          data-bid={b.id}
          data-addr={addr}
          data-index={index}
        >
          <div className="block-head" onClick={container && !locked ? () => onActive(slotAddr(b.id, slotKeys(b)[0])) : undefined}>
            <span
              className="grip"
              title="Drag me to move this block"
              aria-label="drag to move"
              onPointerDown={(e) => {
                if (locked) return;
                e.preventDefault();
                e.stopPropagation();
                startDrag({ id: b.id, type: b.type }, e.clientX, e.clientY);
              }}
            >
              ⠿
            </span>
            <span className="b-label" onPointerDown={(e) => armDrag(e, { id: b.id, type: b.type })} onContextMenu={(e) => e.preventDefault()}>
              {m.icon} {m.label}
            </span>
            <span className="fields" onClick={(e) => e.stopPropagation()}>
              {fields}
            </span>
            <span className="b-tools" onClick={(e) => e.stopPropagation()}>
              <button disabled={locked} aria-label="move up" onClick={() => onChange(moveBlock(blocks, b.id, -1))}>
                ▲
              </button>
              <button disabled={locked} aria-label="move down" onClick={() => onChange(moveBlock(blocks, b.id, 1))}>
                ▼
              </button>
              <button className="x" disabled={locked} aria-label="remove" onClick={() => del(b.id)}>
                ✕
              </button>
            </span>
          </div>
          {b.type === 'if' ? (
            <>
              {renderSlot(b, 'then', 'then')}
              {b.els ? (
                <>
                  {renderSlot(b, 'els', 'else')}
                  <button
                    className="link light"
                    disabled={locked}
                    onClick={() => {
                      patch(b.id, { els: undefined });
                      onActive(slotAddr(b.id, 'then'));
                    }}
                  >
                    remove else
                  </button>
                </>
              ) : (
                <button className="link light" disabled={locked} onClick={() => (patch(b.id, { els: [] }), onActive(slotAddr(b.id, 'els')))}>
                  + add else
                </button>
              )}
            </>
          ) : (
            container && renderSlot(b, 'body')
          )}
        </div>
      );
    }
  };

  const palette = tools.filter((t) => t in META);
  const given = Object.entries(data);

  return (
    <div className="blocks">
      {given.length > 0 && (
        <div className="given">
          <b>📦 Given to you</b>
          {given.map(([k, val]) => (
            <code key={k}>
              {k} = {JSON.stringify(val)}
            </code>
          ))}
        </div>
      )}
      {limitNote && used >= limit && (
        <div className="limit-note" onClick={() => setLimitNote(false)}>
          📏 Block limit reached ({limit} blocks). Make your program shorter. Can a 🔁 Repeat or a 🛠️ Function help? (Fun blocks are always free!){limitTip}
        </div>
      )}
      {[palette.filter((t) => !isFun(t)), palette.filter((t) => isFun(t))].map((group, gi) =>
        group.length === 0 ? null : (
          <div key={gi} className={`palette ${gi === 1 ? 'fun-palette' : ''}`}>
            {gi === 1 && <span className="palette-label">🎉 Fun blocks (free!)</span>}
            {group.map((t) => (
              <button
                key={t}
                className={`pal ${META[t].cls}`}
                onClick={() => add(t)}
                onPointerDown={(e) => !(t === 'call' && !hasFunction) && armDrag(e, { type: t })}
                onContextMenu={(e) => e.preventDefault()}
                disabled={locked || (t === 'call' && !hasFunction)}
                data-full={full(t) ? 'yes' : undefined}
                title={t === 'call' && !hasFunction ? 'Make a Function first, then you can Call it' : undefined}
              >
                <span className="pi">{META[t].icon}</span>
                {META[t].label}
              </button>
            ))}
          </div>
        ),
      )}
      <div className="program">
        <div className="program-title">
          <span>🧩 My program</span>
          <span>
            <span className={used >= limit ? 'at-limit' : ''}>
              {used}{limit < Infinity ? ` / ${limit}` : ''} blocks
            </span>
            {blocks.length > 0 && !locked && (
              <button
                className="link"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    window.setTimeout(() => setConfirmClear(false), 3000);
                    return;
                  }
                  setConfirmClear(false);
                  onChange([]);
                  onActive('');
                }}
              >
                {confirmClear ? 'tap again to clear all' : 'clear'}
              </button>
            )}
          </span>
        </div>
        <div className="start-cap">🚦 When GO is pressed…</div>
        {renderList(blocks, '')}
        <div className={`slot top ${act === '' ? 'on' : ''} ${isOver('', blocks.length) ? 'drop-over' : ''}`} data-drop={`|${blocks.length}`} onClick={() => !locked && onActive('')}>
          {blocks.length === 0 ? 'Tap or drag a block here to start!' : act === '' ? '⬇ new blocks go here' : 'tap to add blocks at the end'}
        </div>
      </div>
      {drag && ghost && (
        <div className={`drag-ghost ${META[drag.type].cls} ${over ? '' : 'nowhere'}`} style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          {META[drag.type].icon} {META[drag.type].label}
        </div>
      )}
    </div>
  );
}
