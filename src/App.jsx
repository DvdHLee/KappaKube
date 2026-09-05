import { useState } from 'react';
import Scene from './three/Scene.jsx';
import ViewControls from './ui/ViewControls.jsx';

export default function App() {
  const [n, setN] = useState(3);
  const [view, setView] = useState(null); // requested preset
  const [activeView, setActiveView] = useState(null); // where the camera actually is
  const [autoRotate, setAutoRotate] = useState(false);

  // A fresh object per click so the rig re-triggers even on the same preset.
  const goToView = (name) => setView({ name, at: performance.now() });

  const changeSize = (size) => {
    setN(size);
    goToView('iso');
  };

  return (
    <div className="app">
      <header className="brand">
        <span className="brand-mark">KappaKube</span>
        <span className="brand-sub">phase 2 · static render</span>
      </header>

      <Scene n={n} view={view} autoRotate={autoRotate} onActiveView={setActiveView} />

      <ViewControls
        n={n}
        activeView={activeView}
        onSize={changeSize}
        onView={goToView}
        autoRotate={autoRotate}
        onAutoRotate={setAutoRotate}
      />
    </div>
  );
}
