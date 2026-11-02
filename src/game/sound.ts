let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One note. If `to` is given the pitch slides there (quacks, moos and lasers). */
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08, to?: number, out?: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + start + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(out ?? ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

const notes = (list: number[], gap: number, dur: number, type: OscillatorType = 'triangle', vol = 0.1) => list.forEach((f, i) => tone(f, i * gap, dur, type, vol));

/** The horns you can buy in the garage. */
function horn(kind: string) {
  switch (kind) {
    case 'duck':
      tone(620, 0, 0.12, 'square', 0.09, 320);
      tone(620, 0.16, 0.12, 'square', 0.09, 320);
      break;
    case 'trumpet':
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, i === 2 ? 0.35 : 0.12, 'sawtooth', 0.07));
      break;
    case 'cow':
      tone(190, 0, 0.7, 'sawtooth', 0.1, 120);
      break;
    case 'laser':
      tone(1600, 0, 0.16, 'sine', 0.1, 200);
      tone(1600, 0.18, 0.16, 'sine', 0.1, 200);
      break;
    case 'train':
      tone(440, 0, 0.22, 'triangle', 0.1);
      tone(350, 0.25, 0.3, 'triangle', 0.1);
      break;
    default:
      tone(330, 0, 0.12, 'square', 0.1);
      tone(262, 0.1, 0.2, 'square', 0.1);
  }
}

export type Sfx =
  | 'tap'
  | 'click'
  | 'move'
  | 'coin'
  | 'crash'
  | 'win'
  | 'honk'
  | 'say'
  | 'gate'
  | 'fanfare'
  | 'almost'
  | 'star'
  | 'badge'
  | 'buy'
  | 'levelup'
  | 'open'
  // fun blocks
  | 'spin'
  | 'jump'
  | 'dance'
  | 'flash'
  | 'sing';

/** Plays a sound effect. `hornKind` picks the horn for 'honk'. */
export function play(sfx: Sfx, enabled: boolean, hornKind = 'beep') {
  if (!enabled || !audio()) return;
  switch (sfx) {
    case 'tap':
      tone(520, 0, 0.06);
      break;
    case 'click':
      tone(880, 0, 0.04, 'sine', 0.06);
      break;
    case 'open':
      tone(300, 0, 0.18, 'sine', 0.06, 900);
      break;
    case 'move':
      tone(140, 0, 0.08, 'sawtooth', 0.04);
      break;
    case 'coin':
      tone(880, 0, 0.08);
      tone(1320, 0.07, 0.14);
      break;
    case 'crash':
      tone(120, 0, 0.25, 'sawtooth', 0.12);
      tone(70, 0.05, 0.3, 'sawtooth', 0.12);
      break;
    case 'almost':
      notes([523, 659, 587], 0.12, 0.18);
      break;
    case 'win':
      notes([523, 659, 784, 1047], 0.12, 0.2, 'triangle', 0.12);
      break;
    case 'fanfare':
      notes([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 0.24, 'triangle', 0.13);
      break;
    case 'star':
      tone(1047, 0, 0.12, 'sine', 0.1);
      tone(1568, 0.06, 0.2, 'sine', 0.08);
      break;
    case 'badge':
      notes([784, 988, 1175, 1568], 0.08, 0.22, 'sine', 0.1);
      break;
    case 'buy':
      tone(1200, 0, 0.06, 'square', 0.07);
      tone(1800, 0.06, 0.25, 'triangle', 0.09);
      break;
    case 'levelup':
      notes([392, 523, 659, 784, 1047, 1319], 0.09, 0.22, 'square', 0.07);
      break;
    case 'honk':
      horn(hornKind);
      break;
    case 'say':
      tone(700, 0, 0.05, 'sine', 0.08);
      tone(900, 0.06, 0.05, 'sine', 0.08);
      break;
    case 'gate':
      notes([392, 523, 659, 784], 0.07, 0.12, 'sine', 0.1);
      break;
    case 'spin':
      tone(400, 0, 0.6, 'sine', 0.08, 1400);
      break;
    case 'jump':
      tone(220, 0, 0.18, 'square', 0.08, 660);
      tone(660, 0.2, 0.22, 'square', 0.06, 220);
      break;
    case 'dance':
      notes([392, 494, 587, 494, 659, 587], 0.11, 0.1, 'square', 0.06);
      break;
    case 'flash':
      [0, 0.2, 0.4].forEach((t) => {
        tone(900, t, 0.1, 'square', 0.05);
        tone(650, t + 0.1, 0.1, 'square', 0.05);
      });
      break;
    case 'sing':
      notes([523, 523, 784, 784, 880, 880, 784], 0.14, 0.13, 'sine', 0.1);
      break;
  }
}

// ---------- background music: a gentle, quiet loop made from notes (no audio files) ----------

const C = 261.63;
const scale = (step: number) => C * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][((step % 10) + 10) % 10] / 12 + Math.floor(step / 10));

/** Each tune: melody steps (on a happy pentatonic scale, -1 = rest) and a bass line, 8 beats per bar. */
const TUNES: Record<string, { tempo: number; melody: number[]; bass: number[]; shift: number }> = {
  map: { tempo: 112, melody: [4, 5, 6, 5, 4, -1, 2, 3, 4, 3, 2, -1, 0, 2, 3, -1], bass: [0, 0, 3, 3, 4, 4, 3, 3], shift: 0 },
  level: { tempo: 124, melody: [0, 2, 4, 2, 5, 4, 2, -1, 3, 4, 5, 7, 6, 5, 4, -1], bass: [0, 0, 4, 4, 3, 3, 4, 4], shift: 0 },
};

let timer: number | undefined;
let musicGain: GainNode | null = null;
let current = '';

/** Starts (or switches) the background tune. `world` nudges the key so each world sounds a little different. */
export function startMusic(tune: 'map' | 'level', world = 0) {
  const key = `${tune}:${world}`;
  if (key === current && timer) return;
  stopMusic();
  const a = audio();
  if (!a) return;
  current = key;
  musicGain = a.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(a.destination);
  const t = TUNES[tune];
  const beat = 60 / t.tempo / 2; // eighth notes
  const lift = Math.pow(2, ((world * 2) % 7) / 12);
  let step = 0;
  let next = a.currentTime + 0.1;
  const schedule = () => {
    if (!ctx || !musicGain) return;
    // if the timer fell behind (busy page, sleeping tab), skip ahead instead of playing all missed notes at once
    next = Math.max(next, ctx.currentTime + 0.05);
    // schedule a little ahead, so the music doesn't stutter when the page is busy
    while (next < ctx.currentTime + 0.4) {
      const m = t.melody[step % t.melody.length];
      const at = next - ctx.currentTime;
      if (m >= 0) tone(scale(m) * lift, at, beat * 0.9, 'triangle', 0.05, undefined, musicGain);
      if (step % 2 === 0) tone((scale(t.bass[(step / 2) % t.bass.length]) / 2) * lift, at, beat * 1.8, 'sine', 0.06, undefined, musicGain);
      step++;
      next += beat;
    }
  };
  schedule();
  timer = window.setInterval(schedule, 120);
}

export function stopMusic() {
  window.clearInterval(timer);
  timer = undefined;
  current = '';
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

/** Browsers only allow sound after a tap; call this from a tap. Returns true once sound is really on. */
export function wakeAudio(): boolean {
  return audio()?.state === 'running';
}

// pause all sound when the app goes to the background (phone home button, another tab), resume when it comes back
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
}
