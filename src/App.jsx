import { useEffect, useRef, useState } from 'react';
import Scene from './three/Scene.jsx';
import { setColorScheme } from './three/geometry.js';
import SetupPanel from './ui/SetupPanel.jsx';
import AlgMenu from './ui/AlgMenu.jsx';
import AlgHeader from './ui/AlgHeader.jsx';
import Transport from './ui/Transport.jsx';
import MovePad from './ui/MovePad.jsx';
import { useKeyboard } from './ui/useKeyboard.js';
import { useRememberFreeplay } from './ui/useFreeplay.js';
import LearnedToggle from './ui/LearnedToggle.jsx';
import FreeplayTools from './ui/FreeplayTools.jsx';
import PaintPanel from './ui/PaintPanel.jsx';
import { useSwipePager } from './ui/useSwipePager.js';
import Segmented from './ui/Segmented.jsx';
import { useCubeStore } from './state/useCubeStore.js';
import { currentScheme, usePrefsStore } from './state/usePrefsStore.js';
import { CASES_BY_ID } from './data/cases.js';
import { parseAlg } from './core/notation.js';
import { invertAlg } from './core/moves.js';
import { deserializeCube } from './core/serialize.js';
import { algIndexFor } from './ui/useLoadCase.js';

/**
 * Put the theme on the document root, where the CSS tokens hang off it.
 * Dark is the stylesheet's default, so only light needs an attribute.
 */
function useTheme() {
  const theme = usePrefsStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return theme;
}

/** Push the stored colour scheme into the shared cubie geometries. */
function useColorScheme() {
  const top = usePrefsStore((s) => s.top);
  const front = usePrefsStore((s) => s.front);

  useEffect(() => {
    setColorScheme(currentScheme({ top, front }));
  }, [top, front]);
}

/**
 * Restore the last session once, after the persisted preferences have hydrated.
 * Guarded by a ref so it cannot fight the user's first interaction.
 */
function useRestoreSession() {
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const { size, selectedCaseId, chosenAlg, freeplay } = usePrefsStore.getState();
    const store = useCubeStore.getState();

    const testCase = selectedCaseId ? CASES_BY_ID.get(selectedCaseId) : null;
    if (testCase && testCase.n === size) {
      const alg = parseAlg(testCase.algs[algIndexFor(testCase, chosenAlg)], size);
      store.loadCase(invertAlg(alg), alg, size);
      return;
    }

    // No case open, so bring back the cube that was left mid-play. A stored
    // state that fails to load simply gives a solved cube.
    const remembered = deserializeCube(freeplay[size]);
    if (remembered) store.enterFreeplay(remembered);
    else if (size !== store.n) store.setSize(size);
  }, []);
}

const PAGES = [
  { value: '0', label: 'Algorithms' },
  { value: '1', label: 'Cube' },
];

export default function App() {
  const [view, setView] = useState(null); // requested preset
  const [activeView, setActiveView] = useState(null); // where the camera actually is
  const [autoRotate, setAutoRotate] = useState(false);

  // The pager position is remembered, so a phone reopens on the page it was
  // left on. Reading it once at mount keeps the restore out of the render path.
  const pagesRef = useRef(null);
  const [storedPage] = useState(() => usePrefsStore.getState().page);
  const setStoredPage = usePrefsStore((s) => s.setPage);
  const [page, goToPage] = useSwipePager(pagesRef, {
    initial: storedPage,
    onChange: setStoredPage,
  });

  const n = useCubeStore((s) => s.n);
  const locked = usePrefsStore((s) => s.locked);
  const setLocked = usePrefsStore((s) => s.setLocked);

  const theme = useTheme();
  useKeyboard();
  useColorScheme();
  useRestoreSession();
  useRememberFreeplay();

  // A fresh object per click so the rig re-triggers even on the same preset.
  const goToView = (name) => {
    // Snapping to a preset while auto-rotate is on would drift straight back
    // off it, so asking for iso stops the spin. Free leaves it alone.
    if (name === 'iso') setAutoRotate(false);
    setView({ name, at: performance.now() });
  };

  return (
    <>
      {/* On a phone this is a horizontal scroll-snap pager: the rail is page
          one, the cube page two. On desktop it stays a three-column grid and
          never scrolls sideways, so the same markup serves both. */}
      <div className={`app ${locked ? 'is-locked' : ''}`} ref={pagesRef}>
        <aside className="rail rail--left">
          <header className="brand">
            <span className="brand-mark">KappaKube</span>
          </header>
          <SetupPanel
            activeView={activeView}
            onView={goToView}
            autoRotate={autoRotate}
            onAutoRotate={setAutoRotate}
          />
          <AlgMenu />
        </aside>

        <main className="stage">
          <AlgHeader />

          <div className="stage-canvas">
            {/* One bar across the top of the cube so both sides line up. */}
            <div className="cube-corners">
              <div className="cube-corner-group">
                <LearnedToggle />
              </div>

              <div className="cube-corner-group">
                <FreeplayTools />
              </div>

              <div className="cube-corner-group">
                {/* Locking holds the camera still so a drag on the cube turns a
                    layer rather than swinging the view, and on a phone stops
                    the page swiping away mid-turn. */}
                <button
                  type="button"
                  className={`cube-corner-btn lock-btn ${locked ? 'is-active' : ''}`}
                  aria-pressed={locked}
                  aria-label={
                    locked ? 'Locked: drag to turn a layer' : 'Unlocked: drag to look around'
                  }
                  title={locked ? 'Locked: drag to turn a layer' : 'Unlocked: drag to look around'}
                  onClick={() => setLocked(!locked)}
                >
                  {locked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
            <Scene
              n={n}
              view={view}
              autoRotate={autoRotate}
              locked={locked}
              theme={theme}
              onActiveView={setActiveView}
            />
          </div>
          <Transport />

          {/* Anchored to the stage, not the canvas, so it sits in the space the
              transport leaves empty during freeplay instead of over the cube. */}
          <PaintPanel />
        </main>

        <aside className="rail rail--right">
          <div className="panel-title">Turns</div>
          <MovePad />
        </aside>
      </div>

      <nav className="pager">
        <Segmented
          options={PAGES}
          value={String(page)}
          onChange={(value) => goToPage(Number(value))}
        />
      </nav>
    </>
  );
}
