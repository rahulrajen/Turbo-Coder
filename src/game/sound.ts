let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur);
}

export type Sfx = 'tap' | 'move' | 'coin' | 'crash' | 'win' | 'honk' | 'say' | 'gate' | 'fanfare';

export function play(sfx: Sfx, enabled: boolean) {
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
      tone(330, 0, 0.12, 'square', 0.1);
      tone(262, 0.1, 0.2, 'square', 0.1);
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
