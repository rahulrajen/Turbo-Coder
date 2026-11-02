import { useId, type ReactNode } from 'react';
import { resolveCar } from '../game/cars';
import { type Cosmetics, GRADIENTS } from '../game/progress';

const RIMS: Record<string, string> = { white: '#e5e7eb', neon: '#4ade80', gold: '#facc15', flame: '#f97316', rainbow: 'rainbow' };

/** Paint patterns, drawn over the paint inside the car's own outline. */
const PATTERNS: Record<string, { size: number; art: ReactNode }> = {
  dots: { size: 10, art: <circle cx="5" cy="5" r="2.2" fill="#fff" opacity=".55" /> },
  zebra: { size: 10, art: <path d="M-2 2 L12 -2 L12 2 L-2 6 Z M-2 8 L12 4 L12 8 L-2 12 Z" fill="#111" opacity=".55" /> },
  checker: { size: 10, art: <path d="M0 0 H5 V5 H0 Z M5 5 H10 V10 H5 Z" fill="#111" opacity=".38" /> },
  stars: { size: 14, art: <path d="M7 2 l1.4 3 3.2.4-2.4 2.2.7 3.2L7 9.2 4.1 10.8l.7-3.2L2.4 5.4l3.2-.4z" fill="#fff" opacity=".7" /> },
  camo: {
    size: 16,
    art: (
      <>
        <ellipse cx="4" cy="4" rx="4" ry="2.6" fill="#3f6212" opacity=".55" />
        <ellipse cx="12" cy="11" rx="4.5" ry="3" fill="#713f12" opacity=".5" />
        <ellipse cx="13" cy="3" rx="2.5" ry="1.8" fill="#1a2e05" opacity=".5" />
      </>
    ),
  },
  hearts: { size: 12, art: <path d="M6 9.5 C2 6.5 2 3 4.2 3 5.3 3 6 4 6 4 S6.7 3 7.8 3 C10 3 10 6.5 6 9.5Z" fill="#fff" opacity=".6" /> },
  bolts: { size: 14, art: <path d="M8 1 L3 8 H6.5 L5 13 L11 5.5 H7.5 Z" fill="#fde047" opacity=".85" /> },
};

interface Props {
  c: Cosmetics;
  levelId?: number;
  moving?: boolean;
  /** draw this body instead of the player's choice (garage previews) */
  body?: string;
}

const DARK = 'rgba(0,0,0,.3)';
const GLASS = '#bfe8ff';

/** Top-down car, nose pointing up, in a 64 x 96 box. Scales to its container. */
export function CarSvg({ c, levelId, moving = false, body }: Props) {
  const uid = useId().replace(/[:«»]/g, '');
  const car = resolveCar(body ?? c.body, c.color, levelId);
  const grad = car.color.startsWith('grad:') ? GRADIENTS[car.color.slice(5)] : undefined;
  const paint = grad ? `url(#paint${uid})` : car.color;
  const tread = `tread${uid}`;
  const rim = RIMS[c.wheels] ?? null;

  const wheel = (x: number, y: number, w = 6, h = 14) => (
    <g key={`w${x}-${y}`}>
      <rect x={x} y={y} width={w} height={h} rx="2" fill={`url(#${tread})`} stroke={c.wheels === 'white' ? '#f8fafc' : '#0b0b10'} strokeWidth={c.wheels === 'white' ? 1.6 : 1} />
      {rim && <rect x={x + w * 0.25} y={y + h * 0.3} width={w * 0.5} height={h * 0.4} rx="1" fill={rim === 'rainbow' ? `url(#rim${uid})` : rim} />}
    </g>
  );
  const wheels = (xs: number[], ys: number[], w?: number, h?: number) => xs.flatMap((x) => ys.map((y) => wheel(x, y, w, h)));
  const lights = (y = 8, l = 20, r = 38) => (
    <>
      <rect x={l} y={y} width="6" height="4" rx="2" fill="#fff7a8" />
      <rect x={r} y={y} width="6" height="4" rx="2" fill="#fff7a8" />
    </>
  );
  const windshield = (y = 30, x = 21, w = 22, h = 14) => <rect x={x} y={y} width={w} height={h} rx="4" fill={GLASS} stroke={DARK} strokeWidth="1.5" />;
  const rear = (y = 58, x = 22, w = 20, h = 8) => <rect x={x} y={y} width={w} height={h} rx="3" fill="#8fc7e8" stroke={DARK} strokeWidth="1.5" />;
  const shape = (d: string, fill = paint) => (
    <>
      <path d={d} fill={fill} stroke={DARK} strokeWidth="2" />
      {c.pattern !== 'none' && PATTERNS[c.pattern] && <path d={d} fill={`url(#pat${uid})`} />}
    </>
  );

  let art: ReactNode;
  let beamY = 4;
  switch (car.id) {
    case 'mini':
      art = (
        <>
          {wheels([10, 48], [26, 62])}
          {shape('M32 14 C46 14 48 28 48 40 L48 70 C48 80 42 86 32 86 C22 86 16 80 16 70 L16 40 C16 28 18 14 32 14 Z')}
          <rect x="20" y="40" width="24" height="26" rx="6" fill="#fff" opacity=".92" />
          {windshield(30, 21, 22, 10)}
          {lights(18, 19, 39)}
        </>
      );
      beamY = 14;
      break;
    case 'taxi':
      art = (
        <>
          {wheels([8, 50], [22, 66])}
          {shape('M18 6 H46 Q52 6 52 14 V82 Q52 90 44 90 H20 Q12 90 12 82 V14 Q12 6 18 6 Z')}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={i % 2 ? 12 : 48} y={36 + i * 4} width="4" height="4" fill="#111" />
          ))}
          {windshield(24)}
          {rear(66)}
          <rect x="22" y="44" width="20" height="10" rx="2" fill="#111" />
          <text x="32" y="51.5" fontSize="7" fontWeight="900" textAnchor="middle" fill="#ffcf24">
            TAXI
          </text>
          {lights()}
        </>
      );
      break;
    case 'police':
      art = (
        <>
          {wheels([8, 50], [22, 66])}
          {shape('M20 4 H44 Q52 4 52 14 V82 Q52 92 42 92 H22 Q12 92 12 82 V14 Q12 4 20 4 Z')}
          <rect x="12" y="38" width="40" height="22" fill="#fff" />
          {windshield(24)}
          {rear(68)}
          <rect className="siren-r" x="17" y="44" width="15" height="9" rx="2" fill="#ef4444" />
          <rect className="siren-b" x="32" y="44" width="15" height="9" rx="2" fill="#3b82f6" />
          {lights(6)}
        </>
      );
      break;
    case 'jeep':
      art = (
        <>
          {wheels([6, 52], [18, 64], 7, 15)}
          {shape('M14 6 H50 V84 Q50 88 46 88 H18 Q14 88 14 84 Z')}
          {windshield(22, 18, 28, 6)}
          <rect x="18" y="32" width="11" height="12" rx="3" fill="#3f2a17" />
          <rect x="35" y="32" width="11" height="12" rx="3" fill="#3f2a17" />
          <line x1="16" y1="30" x2="48" y2="30" stroke="#222" strokeWidth="3" />
          <line x1="16" y1="50" x2="48" y2="50" stroke="#222" strokeWidth="3" />
          <circle cx="32" cy="88" r="7" fill="#15151c" stroke="#444" strokeWidth="2" />
          {lights(8, 16, 42)}
        </>
      );
      break;
    case 'buggy':
      art = (
        <>
          {wheels([4, 52], [14, 64], 8, 18)}
          {shape('M26 8 H38 Q44 8 44 16 V80 Q44 88 38 88 H26 Q20 88 20 80 V16 Q20 8 26 8 Z')}
          <path d="M12 22 L52 22 M12 74 L52 74 M20 36 L44 60 M44 36 L20 60" stroke="#222" strokeWidth="2.5" />
          <circle cx="32" cy="48" r="8" fill="#f97316" stroke="#7c2d12" strokeWidth="2" />
          <rect x="27" y="45" width="10" height="4" rx="2" fill="#111" />
          {lights(10, 22, 36)}
        </>
      );
      beamY = 8;
      break;
    case 'rally':
      art = (
        <>
          {wheels([8, 50], [22, 66])}
          {shape('M32 4 C46 6 50 20 50 34 L50 78 C50 86 44 90 32 90 C20 90 14 86 14 78 L14 34 C14 20 18 6 32 4 Z')}
          {windshield(26)}
          <circle cx="32" cy="54" r="8" fill="#fff" stroke="#111" strokeWidth="1.5" />
          <text x="32" y="57.5" fontSize="10" fontWeight="900" textAnchor="middle" fill="#111">
            7
          </text>
          <rect x="12" y="84" width="40" height="6" rx="2" fill="#111" />
          <circle cx="20" cy="70" r="3" fill="#7c4a1a" opacity=".7" />
          <circle cx="44" cy="40" r="2.5" fill="#7c4a1a" opacity=".7" />
          {lights()}
        </>
      );
      break;
    case 'racer':
      art = (
        <>
          {wheels([10, 48], [16, 68], 7, 14)}
          {shape('M32 4 C38 10 40 24 40 38 L42 76 C42 84 38 90 32 90 C26 90 22 84 22 76 L24 38 C24 24 26 10 32 4 Z')}
          <rect x="10" y="4" width="44" height="6" rx="2" fill={paint} stroke={DARK} strokeWidth="1.5" />
          <rect x="12" y="84" width="40" height="8" rx="2" fill="#111" />
          <circle cx="32" cy="46" r="6" fill="#fde047" stroke="#111" strokeWidth="1.5" />
          <rect x="29" y="58" width="6" height="18" rx="2" fill="#fff" opacity=".85" />
        </>
      );
      beamY = 2;
      break;
    case 'truck':
      art = (
        <>
          {wheels([0, 52], [10, 60], 12, 24)}
          {shape('M16 10 H48 Q52 10 52 16 V80 Q52 86 46 86 H18 Q12 86 12 80 V16 Q12 10 16 10 Z')}
          {windshield(22)}
          {[18, 26, 34, 42].map((x) => (
            <circle key={x} cx={x + 2} cy="40" r="2.5" fill="#fff7a8" />
          ))}
          <rect x="18" y="50" width="28" height="30" rx="3" fill={DARK} />
          {lights(12, 18, 40)}
        </>
      );
      beamY = 8;
      break;
    case 'dozer':
      art = (
        <>
          <rect x="4" y="14" width="10" height="72" rx="4" fill={`url(#${tread})`} stroke="#0b0b10" />
          <rect x="50" y="14" width="10" height="72" rx="4" fill={`url(#${tread})`} stroke="#0b0b10" />
          {shape('M16 16 H48 V84 H16 Z')}
          <rect x="2" y="2" width="60" height="9" rx="2" fill="#9ca3af" stroke="#4b5563" strokeWidth="2" />
          <rect x="20" y="36" width="24" height="24" rx="3" fill="#1f2937" />
          <rect x="23" y="39" width="18" height="8" rx="2" fill={GLASS} />
          <circle cx="40" cy="72" r="3" fill="#111" />
        </>
      );
      beamY = 10;
      break;
    case 'fire':
      art = (
        <>
          {wheels([8, 50], [14, 40, 70])}
          {shape('M18 2 H46 Q52 2 52 10 V88 Q52 94 46 94 H18 Q12 94 12 88 V10 Q12 2 18 2 Z')}
          {windshield(10, 18, 28, 10)}
          <rect className="siren-r" x="22" y="23" width="20" height="5" rx="2" fill="#fde047" />
          <rect x="22" y="32" width="4" height="58" fill="#e5e7eb" />
          <rect x="38" y="32" width="4" height="58" fill="#e5e7eb" />
          {[36, 44, 52, 60, 68, 76, 84].map((y) => (
            <rect key={y} x="22" y={y} width="20" height="2.5" fill="#e5e7eb" />
          ))}
          {lights(4)}
        </>
      );
      beamY = 0;
      break;
    case 'bus':
      art = (
        <>
          {wheels([8, 50], [14, 72])}
          {shape('M18 2 H46 Q50 2 50 8 V88 Q50 94 44 94 H20 Q14 94 14 88 V8 Q14 2 18 2 Z')}
          {windshield(6, 18, 28, 8)}
          {[20, 32, 44, 56, 68, 80].map((y) => (
            <g key={y}>
              <rect x="16" y={y} width="7" height="8" rx="2" fill={GLASS} />
              <rect x="41" y={y} width="7" height="8" rx="2" fill={GLASS} />
            </g>
          ))}
          {['#ffcf24', '#22c55e', '#3b82f6', '#fff'].map((f, i) => (
            <circle key={f} cx={27 + (i % 2) * 10} cy={34 + i * 12} r="2.5" fill={f} />
          ))}
        </>
      );
      beamY = 0;
      break;
    case 'boat':
      art = (
        <>
          {wheels([10, 48], [36, 66])}
          {moving && (
            <path className="wake" d="M18 94 Q24 102 20 110 M32 96 Q32 104 32 112 M46 94 Q40 102 44 110" stroke="#e0f2fe" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
          {shape('M32 2 C44 14 50 30 50 50 L50 84 Q50 92 42 92 H22 Q14 92 14 84 L14 50 C14 30 20 14 32 2 Z')}
          {[48, 56, 64, 72, 80].map((y) => (
            <line key={y} x1="18" y1={y} x2="46" y2={y} stroke="#a16207" strokeWidth="1.5" opacity=".6" />
          ))}
          <rect x="22" y="26" width="20" height="16" rx="4" fill="#fff" stroke={DARK} strokeWidth="1.5" />
          <rect x="25" y="29" width="14" height="6" rx="2" fill={GLASS} />
          <circle cx="32" cy="62" r="5" fill="#ef4444" stroke="#fff" strokeWidth="2.5" />
        </>
      );
      beamY = 0;
      break;
    case 'sub':
      art = (
        <>
          {wheels([10, 48], [26, 62])}
          {shape('M32 6 C46 6 50 22 50 40 L50 70 C50 84 42 90 32 90 C22 90 14 84 14 70 L14 40 C14 22 18 6 32 6 Z')}
          {[28, 44, 60].map((y) => (
            <circle key={y} cx="32" cy={y} r="5" fill={GLASS} stroke="#475569" strokeWidth="2" />
          ))}
          <rect x="29" y="70" width="6" height="12" rx="2" fill="#475569" />
          <g transform="translate(32 92)">
            <g>
              {moving && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />}
              <ellipse rx="9" ry="2.5" fill="#64748b" />
              <ellipse rx="2.5" ry="6" fill="#94a3b8" />
            </g>
          </g>
          {moving && (
            <g className="bubbles-fx" fill="none" stroke="#e0f2fe" strokeWidth="1.5">
              <circle cx="22" cy="100" r="2.5" />
              <circle cx="42" cy="104" r="2" />
              <circle cx="30" cy="110" r="3" />
            </g>
          )}
        </>
      );
      beamY = 4;
      break;
    case 'rocket':
      art = (
        <>
          <path className={`flame ${moving ? 'on' : ''}`} d="M24 86 Q32 118 40 86 Z" fill="#fb923c" />
          <path className={`flame inner ${moving ? 'on' : ''}`} d="M28 86 Q32 106 36 86 Z" fill="#fde047" />
          <path d="M18 66 L6 90 L22 84 Z M46 66 L58 90 L42 84 Z" fill="#ef4444" stroke={DARK} strokeWidth="1.5" />
          {shape('M32 2 C42 14 46 30 46 48 L46 80 Q46 88 38 88 H26 Q18 88 18 80 L18 48 C18 30 22 14 32 2 Z')}
          <ellipse cx="32" cy="34" rx="8" ry="11" fill="#67e8f9" stroke="#0e7490" strokeWidth="2" />
          <path d="M32 58 l2 4 4 .5 -3 3 1 4 -4-2 -4 2 1-4 -3-3 4-.5z" fill="#fde047" />
        </>
      );
      beamY = 0;
      break;
    case 'ghost':
      art = (
        <g className="ghosty">
          {wheels([8, 50], [22, 66])}
          {shape('M20 4 H44 Q52 4 52 14 V84 L46 92 L40 86 L32 94 L24 86 L18 92 L12 84 V14 Q12 4 20 4 Z')}
          <ellipse cx="24" cy="24" rx="6" ry="8" fill="#fff" />
          <ellipse cx="40" cy="24" rx="6" ry="8" fill="#fff" />
          <circle className="pupil" cx="24" cy="22" r="3" fill="#111" />
          <circle className="pupil" cx="40" cy="22" r="3" fill="#111" />
          <ellipse cx="32" cy="44" rx="6" ry="4" fill="#111" opacity=".75" />
          <rect x="20" y="56" width="24" height="18" rx="4" fill="#4c1d95" opacity=".55" />
        </g>
      );
      beamY = 2;
      break;
    default:
      art = (
        <>
          {wheels([8, 50], [24, 70])}
          {shape('M32 4 C46 6 50 20 50 34 L50 74 C50 84 44 90 32 90 C20 90 14 84 14 74 L14 34 C14 20 18 6 32 4 Z')}
          {windshield()}
          {rear(56)}
          {lights()}
        </>
      );
  }

  return (
    <svg className={`car-svg car-${car.id}`} viewBox="0 0 64 96" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <pattern id={tread} width="6" height="4" patternUnits="userSpaceOnUse">
          <rect width="6" height="4" fill="#15151c" />
          <rect width="6" height="1.4" fill="#3d3d4d" />
          {moving && <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 4" dur="0.22s" repeatCount="indefinite" />}
        </pattern>
        <linearGradient id={`beam${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff7a8" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff7a8" stopOpacity="0" />
        </linearGradient>
        {grad && (
          <linearGradient id={`paint${uid}`} x1="0" y1="0" x2="1" y2="1">
            {grad.map((s, i) => (
              <stop key={i} offset={i / (grad.length - 1)} stopColor={s} />
            ))}
          </linearGradient>
        )}
        {(c.wheels === 'rainbow' || c.glow === 'rainbow') && (
          <linearGradient id={`rim${uid}`} x1="0" y1="0" x2="0" y2="1">
            {GRADIENTS.rainbow.map((s, i) => (
              <stop key={i} offset={i / (GRADIENTS.rainbow.length - 1)} stopColor={s} />
            ))}
          </linearGradient>
        )}
        {PATTERNS[c.pattern] && (
          <pattern id={`pat${uid}`} width={PATTERNS[c.pattern].size} height={PATTERNS[c.pattern].size} patternUnits="userSpaceOnUse">
            {PATTERNS[c.pattern].art}
          </pattern>
        )}
        {c.glow !== 'none' && (
          <filter id={`glow${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        )}
      </defs>
      {c.glow !== 'none' && (
        <ellipse
          className={`underglow ${c.glow === 'rainbow' ? 'rainbow' : ''}`}
          cx="32"
          cy="48"
          rx="30"
          ry="46"
          fill={c.glow === 'rainbow' ? `url(#rim${uid})` : c.glow}
          filter={`url(#glow${uid})`}
        />
      )}
      {moving && car.id !== 'rocket' && car.id !== 'ghost' && (
        <path className={`beam ${moving ? 'on' : ''}`} d={`M18 ${beamY} L6 ${beamY - 30} L58 ${beamY - 30} L46 ${beamY} Z`} fill={`url(#beam${uid})`} />
      )}
      <g style={{ filter: 'drop-shadow(0 3px 2px rgba(0,0,0,.45))' }}>{art}</g>
      {c.stripe === 'racing' && car.id !== 'dozer' && (
        <g opacity=".9">
          <rect x="27" y="10" width="3" height="74" fill="#fff" />
          <rect x="34" y="10" width="3" height="74" fill="#fff" />
        </g>
      )}
      {c.stripe === 'flame' && <path d="M20 84 Q23 68 27 74 Q29 58 32 68 Q35 58 37 74 Q41 68 44 84 Z" fill="#ffb300" stroke="#ff3d00" strokeWidth="2" opacity=".95" />}
      {c.sticker !== 'none' && (
        <text x="32" y="80" fontSize="11" textAnchor="middle" dominantBaseline="middle">
          {c.sticker}
        </text>
      )}
      {c.topper !== 'none' && (
        <text className="topper" x="32" y="50" fontSize="17" textAnchor="middle" dominantBaseline="middle" style={{ filter: 'drop-shadow(0 2px 1px rgba(0,0,0,.5))' }}>
          {c.topper}
        </text>
      )}
    </svg>
  );
}
