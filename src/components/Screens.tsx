import { useState } from 'react';
import { CHAPTERS } from '../game/chapters';
import { LEVELS } from '../game/levels';
import { BADGES, SHOP, type Progress, type ShopItem, levelFromXp, liveStreak } from '../game/progress';
import { CarSvg } from './CarSvg';
import { ChapterBlock } from './LevelGrid';

export function Header({ p, onGo }: { p: Progress; onGo: (s: 'map') => void }) {
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
        <span className="pill" title="Day streak">
          🔥 {liveStreak(p)}
        </span>
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
  const next = LEVELS.find((l) => !(p.levels[l.id]?.stars > 0));
  const stars = Object.values(p.levels).reduce((n, r) => n + r.stars, 0);
  const perfects = Object.values(p.levels).filter((r) => r.perfect).length;
  return (
    <div className="page">
      <div className="hero">
        <div className="hero-car">
          <CarSvg c={p.cosmetics} levelId={next?.id} moving />
        </div>
        <div className="hero-text">
          <h1>{p.name ? `Hi ${p.name}!` : 'Hi Driver!'}</h1>
          <p>{next ? `Next up: Level ${next.id}, ${next.title}` : 'You finished all 100 levels! Replay for more ⭐'}</p>
          <small>
            ⭐ {stars}/300 · 👑 {perfects} Perfect Runs
          </small>
        </div>
        {next && (
          <button className="btn go" onClick={() => onPlay(next.id)}>
            Continue ▶
          </button>
        )}
      </div>
      <p className="map-note">Every level is open. Jump to any track you like! The glowing one is the suggested next stop.</p>
      {CHAPTERS.map((c) => (
        <ChapterBlock key={c.id} chapter={c} p={p} nextId={next?.id} onPlay={onPlay} />
      ))}
    </div>
  );
}

const swatchOf = (it: ShopItem, p: Progress) => {
  if (it.cat === 'color') return it.value === 'auto' ? '🎨' : <i style={{ background: it.value }} />;
  if (it.cat === 'body')
    return it.value === 'auto' ? (
      '🎲'
    ) : (
      <span className="mini-car">
        <CarSvg c={p.cosmetics} body={it.value} />
      </span>
    );
  if (it.cat === 'stripe') return it.value === 'none' ? '∅' : it.value === 'racing' ? '▮▮' : '🔥';
  return it.value === 'none' ? '∅' : it.value;
};

export function Garage({ p, buy, equip }: { p: Progress; buy: (i: ShopItem) => void; equip: (i: ShopItem) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const groups: [keyof Progress['cosmetics'], string][] = [
    ['body', '🚘 Cars'],
    ['color', '🎨 Paint'],
    ['stripe', '🏎️ Stripes'],
    ['sticker', '✨ Stickers'],
    ['trail', '💨 Trails'],
  ];
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
      {note && (
        <div className="message garage-note" onClick={() => setNote(null)}>
          {note}
        </div>
      )}
      {groups.map(([cat, title]) => (
        <div key={cat} className="shop-group">
          <div className="section-label">{title}</div>
          <div className={`shop-grid ${cat === 'body' ? 'cars' : ''}`}>
            {SHOP.filter((i) => i.cat === cat).map((it) => {
              const owned = p.owned.includes(it.key);
              const equipped = p.cosmetics[cat] === it.value;
              const afford = p.coins >= it.cost;
              const pick = () => {
                if (owned) equip(it);
                else if (afford) {
                  buy(it);
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

export function Settings({ p, onName, onSound, onCodeMode, onReset }: { p: Progress; onName: (n: string) => void; onSound: (s: boolean) => void; onCodeMode: (c: boolean) => void; onReset: () => void }) {
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
    </div>
  );
}
