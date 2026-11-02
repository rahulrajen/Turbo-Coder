import { useEffect, useState } from 'react';
import { LEVELS } from './game/levels';
import { useProgress } from './game/progress';
import { startMusic, stopMusic, wakeAudio } from './game/sound';
import { Badges, Garage, Header, MapScreen, Nav, Settings } from './components/Screens';
import { LevelScreen } from './components/LevelScreen';

type Screen = 'map' | 'garage' | 'badges' | 'settings';

const FLOATIES = ['☁️', '⭐', '🚗', '✨', '🏁', '☁️', '🪙', '🌈'];

function Floaties() {
  return (
    <div className="floaties" aria-hidden>
      {FLOATIES.map((e, i) => (
        <span key={i} style={{ left: `${(i * 13 + 5) % 100}%`, animationDuration: `${18 + (i % 4) * 6}s`, animationDelay: `${-i * 3}s`, fontSize: `${22 + (i % 3) * 10}px` }}>
          {e}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const { progress, setProgress, completeLevel, buy, equip, reset } = useProgress();
  const [screen, setScreen] = useState<Screen>('map');
  const [playing, setPlaying] = useState<number | null>(null);

  // the phone/browser Back button leaves a level instead of leaving the whole app
  useEffect(() => {
    const onPop = () => setPlaying(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const openLevel = (id: number) => {
    if (!history.state?.level) history.pushState({ level: true }, '');
    setPlaying(id);
  };
  const exitLevel = () => {
    if (history.state?.level) history.back(); // popstate closes the level
    else setPlaying(null);
  };

  const level = playing ? LEVELS[playing - 1] : null;

  // background music: one tune for menus, another (in each world's key) while racing
  useEffect(() => {
    if (!progress.music) {
      stopMusic();
      return;
    }
    startMusic(level ? 'level' : 'map', level?.chapter ?? 0);
  }, [progress.music, level?.chapter, level]);
  // browsers only allow sound after the first tap, so wake the audio up then
  // (phones only count the END of a tap as permission, so listen for that, and keep trying until sound is on)
  useEffect(() => {
    const events = ['pointerup', 'touchend', 'keydown'] as const;
    const wake = () => {
      if (wakeAudio()) events.forEach((e) => window.removeEventListener(e, wake));
    };
    events.forEach((e) => window.addEventListener(e, wake));
    return () => events.forEach((e) => window.removeEventListener(e, wake));
  }, []);
  const setMusic = (music: boolean) => setProgress((p) => ({ ...p, music }));

  if (!progress.name && !progress.welcomed) {
    return (
      <>
        <Floaties />
        <div className="modal-back">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
              setProgress((p) => ({ ...p, name, welcomed: true }));
            }}
          >
            <div className="welcome-car">🏎️</div>
            <h2>Welcome to Turbo Coder!</h2>
            <p className="sub">Tell your car where to go in {LEVELS.length} levels. Win stars and coins, and make your car look super cool! What is your name?</p>
            <label className="field">
              <input name="name" maxLength={16} placeholder="Type your name" autoFocus autoComplete="off" />
            </label>
            <button className="btn go" type="submit">
              Start ▶
            </button>
          </form>
        </div>
      </>
    );
  }

  if (level) {
    return (
      <>
        <Floaties />
        <LevelScreen
          key={level.id}
          level={level}
          progress={progress}
          hasPrev={level.id > 1}
          hasNext={level.id < LEVELS.length}
          onExit={exitLevel}
          onGoto={setPlaying}
          onMode={(codeMode) => setProgress((p) => ({ ...p, codeMode }))}
          onSeenChapter={(ch) => setProgress((p) => (p.seenChapters.includes(ch) ? p : { ...p, seenChapters: [...p.seenChapters, ch] }))}
          onCar={(body) => setProgress((p) => ({ ...p, cosmetics: { ...p.cosmetics, body } }))}
          onEasy={(easyMode) => setProgress((p) => ({ ...p, easyMode }))}
          onWin={(id, info) => {
            const { next, summary } = completeLevel(id, info);
            setProgress(next);
            return summary;
          }}
        />
      </>
    );
  }

  return (
    <div className="app">
      <Floaties />
      <Header p={progress} onGo={setScreen} onMusic={setMusic} />
      <main>
        {screen === 'map' && <MapScreen p={progress} onPlay={openLevel} />}
        {screen === 'garage' && <Garage p={progress} buy={buy} equip={equip} />}
        {screen === 'badges' && <Badges p={progress} />}
        {screen === 'settings' && (
          <Settings
            p={progress}
            onName={(name) => setProgress((p) => ({ ...p, name }))}
            onSound={(sound) => setProgress((p) => ({ ...p, sound }))}
            onMusic={setMusic}
            onEasy={(easyMode) => setProgress((p) => ({ ...p, easyMode }))}
            onCodeMode={(codeMode) => setProgress((p) => ({ ...p, codeMode }))}
            onReset={reset}
          />
        )}
      </main>
      <Nav screen={screen} onGo={setScreen} />
    </div>
  );
}
