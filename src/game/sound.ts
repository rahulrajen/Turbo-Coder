let ctx: AudioContext | null = null;

/** One note. If `to` is given the pitch slides there (quacks, moos and lasers). */
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08, to?: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + start + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur);
}

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

export type Sfx = 'tap' | 'move' | 'coin' | 'crash' | 'win' | 'honk' | 'say' | 'gate' | 'fanfare';

/** Plays a sound effect. `hornKind` picks the horn for 'honk'. */
export function play(sfx: Sfx, enabled: boolean, hornKind = 'beep') {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    return;
  }
  switch (sfx) {
    case 'tap':
      tone(520, 0, 0.06);
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
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.12));
      break;
    case 'fanfare':
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.24, 'triangle', 0.13));
      break;
    case 'honk':
      horn(hornKind);
      break;
    case 'say':
      tone(700, 0, 0.05, 'sine', 0.08);
      tone(900, 0.06, 0.05, 'sine', 0.08);
      break;
    case 'gate':
      [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.12, 'sine', 0.1));
      break;
  }
}
