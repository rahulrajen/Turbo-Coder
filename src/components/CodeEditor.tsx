import { useRef } from 'react';
import type { BlockType } from '../game/ast';
import { dataPrelude } from '../game/engine';

interface Props {
  code: string;
  onChange: (c: string) => void;
  tools: BlockType[];
  data: Record<string, unknown>;
  locked: boolean;
}

const SNIPPETS: { label: string; text: string; tool?: BlockType }[] = [
  { label: 'forward();', text: 'forward();\n' },
  { label: 'left();', text: 'left();\n' },
  { label: 'right();', text: 'right();\n' },
  { label: 'honk();', text: 'honk();\n', tool: 'honk' },
  { label: 'for loop', text: 'for (let i = 0; i < 3; i++) {\n  \n}\n', tool: 'repeat' },
  { label: 'while', text: 'while (!atFinish()) {\n  \n}\n', tool: 'while' },
  { label: 'if', text: 'if (roadAhead()) {\n  \n}\n', tool: 'if' },
  { label: 'else', text: ' else {\n  \n}\n', tool: 'if' },
  { label: 'let', text: 'let n = 3;\n', tool: 'let' },
  { label: 'function', text: 'function myMove(n) {\n  \n}\n', tool: 'function' },
  { label: 'for…of', text: 'for (const item of items) {\n  \n}\n', tool: 'foreach' },
  { label: 'say()', text: 'say("hello");\n', tool: 'say' },
  { label: 'onSign', text: 'onSign((sign) => {\n  \n});\n', tool: 'onsign' },
  { label: 'roadAhead()', text: 'roadAhead()', tool: 'if' },
  { label: 'roadLeft()', text: 'roadLeft()', tool: 'if' },
  { label: 'roadRight()', text: 'roadRight()', tool: 'if' },
  { label: 'atFinish()', text: 'atFinish()', tool: 'while' },
  { label: 'coinAhead()', text: 'coinAhead()', tool: 'if' },
  { label: 'distanceAhead()', text: 'distanceAhead()', tool: 'if' },
  { label: 'readSign()', text: 'readSign()', tool: 'let' },
  { label: '&&', text: ' && ', tool: 'if' },
  { label: '||', text: ' || ', tool: 'if' },
  { label: '!', text: '!', tool: 'if' },
];

export function CodeEditor({ code, onChange, tools, data, locked }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // only bring the keyboard back if it was already open; tablet kids use the chips instead of typing
  const hadFocus = useRef(false);
  const prelude = dataPrelude(data);
  const firstList = Object.keys(data).find((k) => Array.isArray(data[k])) ?? 'items';

  const insert = (text: string) => {
    const el = ref.current;
    if (!el || locked) return;
    const s = el.selectionStart ?? code.length;
    const e = el.selectionEnd ?? code.length;
    onChange(code.slice(0, s) + text + code.slice(e));
    requestAnimationFrame(() => {
      if (hadFocus.current) el.focus();
      const pos = s + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="code-editor">
      <div className="chips">
        {SNIPPETS.filter((s) => !s.tool || tools.includes(s.tool)).map((s) => (
          <button
            key={s.label}
            className="chip"
            disabled={locked}
            onPointerDown={() => (hadFocus.current = document.activeElement === ref.current)}
            onClick={() => insert(s.text.replace('items', firstList))}
          >
            {s.label}
          </button>
        ))}
      </div>
      {prelude && (
        <pre className="given-code">
          <span>// Given to you</span>
          {'\n'}
          {prelude}
        </pre>
      )}
      <textarea
        ref={ref}
        value={code}
        readOnly={locked}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="code editor"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            insert('  ');
          }
        }}
      />
    </div>
  );
}
