import type { Level, RunResult } from './engine';

/** Tablets "helpfully" turn quotes and dashes into fancy ones that JavaScript can't read. */
export function cleanTyping(code: string): string {
  return code
    .replace(/[“”„″]/g, '"')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ');
}

/** Turns JavaScript's error messages into words a 9-year-old can act on. */
export function friendlyError(raw: string): string {
  const msg = raw.replace(/^Uncaught\s+/, '');
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/^(?:ReferenceError: )?(\w+) is not defined/))) return `"${m[1]}" isn't a command or box I know. Check the spelling (big and small letters count)!`;
  if ((m = msg.match(/(\w+) is not a function/))) return `"${m[1]}" isn't a command. Check the spelling and the ( ) brackets!`;
  if (/Assignment to constant/.test(msg)) return "That box was given to you (or is a loop item) and can't be changed. Make your own box with let!";
  if ((m = msg.match(/Identifier '(\w+)' has already been declared/))) return `"${m[1]}" is made twice, or it's already a command. Use another name, or change it with ${m[1]} = …`;
  if (/Unexpected end of input|missing \)|Unexpected token|Invalid or unexpected token|Unexpected identifier|Unexpected number|Unexpected string/.test(msg))
    return 'Something is typed wrong. Check that every ( has a ), every { has a }, and words are in "quotes".';
  if (/reserved word/.test(msg)) return "One of your names is a special JavaScript word (like new or for). Pick another name!";
  return msg;
}

/** Runs typed JavaScript in a worker; gives up 1.5s after the worker is ready (infinite loops). */
export function runText(level: Level, code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./textRunner.worker.ts', import.meta.url), { type: 'module' });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = (r: RunResult) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(r.error ? { ...r, error: friendlyError(r.error) } : r);
    };
    // a worker that never even loads still has to give up eventually
    const loadTimer = setTimeout(() => done({ outcome: 'ended', frames: [], coins: 0, error: 'The code runner did not start. Try again!' }), 8000);
    worker.onmessage = (e: MessageEvent<RunResult | { ready: true }>) => {
      if ('ready' in e.data) {
        clearTimeout(loadTimer);
        timer = setTimeout(() => done({ outcome: 'limit', frames: [], coins: 0, error: 'Your code ran forever! Check your loop.' }), 1500);
        worker.postMessage({ level, code: cleanTyping(code) });
        return;
      }
      clearTimeout(loadTimer);
      done(e.data);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      clearTimeout(loadTimer);
      done({ outcome: 'ended', frames: [], coins: 0, error: e.message || 'Something is wrong with the code.' });
    };
  });
}
