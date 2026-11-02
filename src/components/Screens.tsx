import { useState } from 'react';
import { CHAPTERS } from '../game/chapters';
import { LEVELS } from '../game/levels';
import { BADGES, GRADIENTS, SHOP, type Progress, type ShopItem, levelFromXp, liveStreak, suggestedNext } from '../game/progress';
import { play } from '../game/sound';
import { CarSvg } from './CarSvg';
import { ChapterBlock } from './LevelGrid';
import { AppGuide } from './Guide';
import { MODES } from '../game/rules';

export function Header({ p, onGo, onMusic }: { p: Progress; onGo: (s: 'map') => void; onMusic: (on: boolean) => void }) {
  const r = levelFromXp(p.xp);
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onGo('map')}>
        🏁 <span>Turbo Coder</span>
      </button>
      <div className="xp" title={`${r.into}/${r.next} XP`}>
        <div className="xp-label">
          Lv {r.level} · {r.rank}
        </div>
        <div className="xp-bar">
          <i style={{ width: `${(r.into / r.next) * 100}%` }} />
        </div>
      </div>
      <div className="chips-top">
        <span className="pill" title="Coins">
          🪙 {p.coins}
        </span>
        <span className="pill" title="Days in a row you played">
          🔥 {liveStreak(p)}
        </span>
        <button className="pill music-btn" onClick={() => onMusic(!p.music)} aria-label={p.music ? 'Turn music off' : 'Turn music on'} title={p.music ? 'Music on' : 'Music off'}>
          {p.music ? '🎵' : '🔇'}
        </button>
      </div>
    </header>
  );
}

export function Nav({ screen, onGo }: { screen: string; onGo: (s: 'map' | 'garage' | 'badges' | 'settings') => void }) {
  const items = [
    ['map', '🗺️', 'Tracks'],
    ['garage', '🔧', 'Garage'],
    ['badges', '🏅', 'Badges'],
    ['settings', '⚙️', 'Me'],
  ] as const;
  return (
    <nav className="nav">
      {items.map(([id, icon, label]) => (
        <button key={id} className={screen === id ? 'on' : ''} onClick={() => onGo(id)}>
          <span>{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}

export function MapScreen({ p, onPlay }: { p: Progress; onPlay: (id: number) => void }) {
  const next = suggestedNext(p);
  const stars = Object.values(p.levels).reduce((n, r) => n + r.stars, 0);
  const perfects = Object.values(p.levels).filter((r) => r.perfect).length;
  const [guide, setGuide] = useState(false);
  return (
    <div className="page">
      {guide && <AppGuide sound={p.sound} onClose={() => setGuide(false)} />}
      <div className="hero">
        <div className="hero-car">
          <CarSvg c={p.cosmetics} levelId={next?.id} moving />
        </div>
        <div className="hero-text">
          <h1>{p.name ? `Hi ${p.name}!` : 'Hi Driver!'}</h1>
          <p>{next ? `Next up: Level ${next.id}, ${next.title}` : `You finished all ${LEVELS.length} levels! Replay for more ⭐`}</p>
          <small>
            ⭐ {stars}/{LEVELS.length * 3} · 👑 {perfects} Perfect Runs
          </small>
        </div>
        <div className="hero-buttons">
          {next && (
            <button className="btn go" onClick={() => onPlay(next.id)}>
              Continue ▶
            </button>
          )}
          <button className="btn guide-btn" onClick={() => setGuide(true)}>
            📚 How to Play
          </button>
        </div>
      </div>
      <p className="map-note">All levels are open. Play any level you like! The glowing one is the level we suggest next.</p>
      {CHAPTERS.map((c) => (
        <ChapterBlock key={c.id} chapter={c} p={p} nextId={next?.id} onPlay={onPlay} defaultOpen={c.id === (next?.chapter ?? 1)} />
      ))}
    </div>
  );
}

const HORN_ICON: Record<string, string> = { beep: '🔔', duck: '🦆', trumpet: '🎺', cow: '🐮', laser: '👾', train: '🚂' };
const PREVIEW_CATS = new Set<string>(['pattern', 'stripe', 'sticker', 'topper', 'wheels', 'glow']);

const swatchOf = (it: ShopItem, p: Progress) => {
  if (it.cat === 'color') {
    if (it.value === 'auto') return '🎨';
    const g = it.value.startsWith('grad:') ? GRADIENTS[it.value.slice(5)] : null;
    return <i style={{ background: g ? `linear-gradient(135deg, ${g.join(', ')})` : it.value }} />;
  }
  if (it.cat === 'body')
    return it.value === 'auto' ? (
      '🎲'
    ) : (
      <span className="mini-car">
        <CarSvg c={p.cosmetics} body={it.value} />
      </span>
    );
  // show the item on a little car, so kids see exactly what they're buying
  if (PREVIEW_CATS.has(it.cat))
    return (
      <span className="mini-car">
        <CarSvg c={{ ...p.cosmetics, [it.cat]: it.value }} body={p.cosmetics.body === 'auto' ? 'classic' : undefined} />
      </span>
    );
  if (it.cat === 'horn') return HORN_ICON[it.value] ?? '📯';
  return it.value === 'none' ? '∅' : it.value;
};

const TABS: { id: string; label: string; cats: [keyof Progress['cosmetics'], string][] }[] = [
  { id: 'cars', label: '🚘 Cars', cats: [['body', 'Pick your ride']] },
  { id: 'paint', label: '🎨 Paint', cats: [['color', 'Paint'], ['pattern', 'Patterns']] },
  { id: 'style', label: '✨ Style', cats: [['stripe', 'Stripes'], ['sticker', 'Stickers'], ['topper', 'On the roof']] },
  { id: 'wheels', label: '🛞 Wheels & Glow', cats: [['wheels', 'Wheels'], ['glow', 'Underglow']] },
  { id: 'fun', label: '💨 Trail & Horn', cats: [['trail', 'Trails'], ['horn', 'Horns (tap to hear)']] },
];

export function Garage({ p, buy, equip }: { p: Progress; buy: (i: ShopItem) => void; equip: (i: ShopItem) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [tab, setTab] = useState(TABS[0].id);
  const groups = (TABS.find((t) => t.id === tab) ?? TABS[0]).cats;
  const auto = p.cosmetics.body === 'auto';
  return (
    <div className="page">
      <div className="garage-preview">
        <div className="turntable">
          <CarSvg c={p.cosmetics} moving />
        </div>
        <div>
          <div className="wallet">🪙 {p.coins} coins</div>
          <small>{auto ? '🎲 Track car: every level gives you its own car!' : 'This car drives on every level.'}</small>
        </div>
      </div>
      <div className="garage-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {note && (
        <div className="message garage-note" onClick={() => setNote(null)}>
          {note}
        </div>
      )}
      {groups.map(([cat, title]) => (
        <div key={cat} className="shop-group">
          <div className="section-label">{title}</div>
          <div className={`shop-grid ${cat === 'body' || PREVIEW_CATS.has(cat) ? 'cars' : ''}`}>
            {SHOP.filter((i) => i.cat === cat).map((it) => {
              const owned = p.owned.includes(it.key);
              const equipped = p.cosmetics[cat] === it.value;
              const afford = p.coins >= it.cost;
              const pick = () => {
                if (cat === 'horn') play('honk', true, it.value); // let them hear it first
                if (owned) equip(it);
                else if (afford) {
                  buy(it);
                  play('buy', p.sound);
                  equip(it);
                  setNote(`🎉 You bought ${it.label}!`);
                } else setNote(`🪙 You need ${it.cost - p.coins} more coins for ${it.label}. Win levels to earn more!`);
              };
              return (
                <button key={it.key} className={`shop-item ${equipped ? 'equipped' : ''} ${!owned && !afford ? 'poor' : ''}`} onClick={pick}>
                  <span className="swatch">{swatchOf(it, p)}</span>
                  <small>{it.label}</small>
                  <em>{equipped ? '✔ Using' : owned ? 'Use' : `🪙 ${it.cost}`}</em>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Badges({ p }: { p: Progress }) {
  return (
    <div className="page">
      <h1>Badges</h1>
      <p className="sub">
        {p.badges.length} of {BADGES.length} earned
      </p>
      <div className="badge-grid">
        {BADGES.map((b) => {
          const got = p.badges.includes(b.id);
          return (
            <div key={b.id} className={`badge ${got ? 'got' : ''}`}>
              <span className="bicon">{got ? b.icon : '❔'}</span>
              <b>{b.title}</b>
              <small>{b.desc}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Settings({ p, onName, onSound, onMusic, onEasy, onCodeMode, onReset }: { p: Progress; onName: (n: string) => void; onSound: (s: boolean) => void; onMusic: (m: boolean) => void; onEasy: (e: boolean) => void; onCodeMode: (c: boolean) => void; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page narrow">
      <h1>My Profile</h1>
      <label className="field">
        Driver name
        <input value={p.name} maxLength={16} placeholder="Type your name" onChange={(e) => onName(e.target.value)} />
      </label>
      <label className="toggle">
        <input type="checkbox" checked={p.sound} onChange={(e) => onSound(e.target.checked)} /> Sound effects
      </label>
      <label className="toggle">
        <input type="checkbox" checked={p.music} onChange={(e) => onMusic(e.target.checked)} /> Background music
      </label>
      <div className="mode-row settings-mode" role="group" aria-label="Game mode">
        <span>Game mode:</span>
        {(['easy', 'normal'] as const).map((m) => (
          <button key={m} className={(m === 'easy') === p.easyMode ? 'on' : ''} onClick={() => onEasy(m === 'easy')}>
            {MODES[m].icon} {MODES[m].name}
          </button>
        ))}
        <small>{MODES[p.easyMode ? 'easy' : 'normal'].text}. Every level still needs its 🎯 must-use block.</small>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={p.codeMode} onChange={(e) => onCodeMode(e.target.checked)} /> Type real code (you can also switch on any level)
      </label>
      <div className="stat-grid">
        <div>
          <b>{p.xp}</b>
          <span>Total XP</span>
        </div>
        <div>
          <b>
            {Object.values(p.levels).filter((l) => l.stars > 0).length}/{LEVELS.length}
          </b>
          <span>Levels done</span>
        </div>
        <div>
          <b>{p.badges.length}</b>
          <span>Badges</span>
        </div>
      </div>
      <div className="danger">
        {confirm ? (
          <>
            <p>Really erase all progress?</p>
            <button
              className="btn danger-btn"
              onClick={() => {
                onReset();
                setConfirm(false);
              }}
            >
              Yes, erase
            </button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="btn ghost" onClick={() => setConfirm(true)}>
            Reset progress
          </button>
        )}
      </div>
      <section className="about">
        <h2>
          💌 About Turbo Coder <span className="ver">v1.5</span>
        </h2>
        <p>
          Turbo Coder is made for curious young minds. Every race you finish teaches you something new about coding. Have fun learning!
        </p>
        <p>
          It's free for everyone. Play it, share it with friends and family, or{' '}
          <a href="https://github.com/rahulrajen/Turbo-Coder" target="_blank" rel="noreferrer">
            copy the code
          </a>{' '}
          and build your own version. You're welcome to make it your own!
        </p>
        <p>
          Got an idea for a new level, spotted a bug, or just want to say hi? Write to{' '}
          <a href="mailto:rahulrajen@gmail.com?subject=Turbo%20Coder">rahulrajen@gmail.com</a>. Every message helps make the game better.
        </p>
        <p className="fuel">
          ☕ If Turbo Coder put a smile on your little racer's face, a small <b>fuel top-up</b> for the developer keeps the engine running and new levels and cars
          rolling in. Drop me a line and I'll tell you how. Even a kind note fills the tank!
        </p>
        <p className="signoff">
          Enjoy the ride!
          <br />
          With love, Ragul 💛
          <br />
          <small>1 November 2026</small>
        </p>
      </section>
    </div>
  );
}
