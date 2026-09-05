import { useEffect, useRef, useState } from 'react';
import Scene from './three/Scene.jsx';
import { setColorScheme } from './three/geometry.js';
import SetupPanel from './ui/SetupPanel.jsx';
import AlgMenu from './ui/AlgMenu.jsx';
import AlgHeader from './ui/AlgHeader.jsx';
import Transport from './ui/Transport.jsx';
import MovePad from './ui/MovePad.jsx';
import { useKeyboard } from './ui/useKeyboard.js';
import { useCubeStore } from './state/useCubeStore.js';
import { currentScheme, usePrefsStore } from './state/usePrefsStore.js';
import { CASES_BY_ID } from './data/cases.js';
import { parseAlg } from './core/notation.js';
import { invertAlg } from './core/moves.js';
import { algIndexFor } from './ui/useLoadCase.js';

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

    const { size, selectedCaseId, chosenAlg } = usePrefsStore.getState();
    const store = useCubeStore.getState();

    if (size !== store.n) store.setSize(size);

    const testCase = selectedCaseId ? CASES_BY_ID.get(selectedCaseId) : null;
    if (testCase && testCase.n === size) {
      const alg = parseAlg(testCase.algs[algIndexFor(testCase, chosenAlg)], size);
      store.loadCase(invertAlg(alg), alg, size);
    }
  }, []);
}

export default function App() {
  const [view, setView] = useState(null); // requested preset
  const [activeView, setActiveView] = useState(null); // where the camera actually is
  const [autoRotate, setAutoRotate] = useState(false);

  const n = useCubeStore((s) => s.n);

  useKeyboard();
  useColorScheme();
  useRestoreSession();

  // A fresh object per click so the rig re-triggers even on the same preset.
  const goToView = (name) => {
    // Snapping to a preset while auto-rotate is on would drift straight back
    // off it, so asking for iso stops the spin. Free leaves it alone.
    if (name === 'iso') setAutoRotate(false);
    setView({ name, at: performance.now() });
  };

  return (
    <div className="app">
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
          <Scene n={n} view={view} autoRotate={autoRotate} onActiveView={setActiveView} />
        </div>
        <Transport />
      </main>

      <aside className="rail rail--right">
        <div className="panel-title">Turns</div>
        <MovePad />
      </aside>
    </div>
  );
}
