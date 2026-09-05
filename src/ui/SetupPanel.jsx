import { COLORS } from '../theme.js';
import { COLOR_NAMES, validFronts } from '../core/scheme.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';
import Segmented from './Segmented.jsx';

const VIEW_OPTIONS = [
  { value: 'iso', label: 'Iso', title: 'Snap back to the standard angle' },
  { value: 'free', label: 'Free', title: 'Wherever you have dragged the camera' },
];

// 4x4 is hidden until it has an algorithm set of its own.
const SIZE_OPTIONS = [
  { value: '2', label: '2x2' },
  { value: '3', label: '3x3' },
];

const swatches = (names) =>
  names.map((name) => ({ value: name, color: COLORS[name], title: name }));

export default function SetupPanel({ activeView, onView, autoRotate, onAutoRotate }) {
  const n = useCubeStore((s) => s.n);
  const setCubeSize = useCubeStore((s) => s.setSize);
  const shuffle = useCubeStore((s) => s.shuffle);
  const reset = useCubeStore((s) => s.reset);
  const busy = useCubeStore((s) => s.current !== null);

  const top = usePrefsStore((s) => s.top);
  const front = usePrefsStore((s) => s.front);
  const setTop = usePrefsStore((s) => s.setTop);
  const setFront = usePrefsStore((s) => s.setFront);
  const setPrefSize = usePrefsStore((s) => s.setSize);
  const selectCase = usePrefsStore((s) => s.selectCase);

  const changeSize = (value) => {
    const size = Number(value);
    setPrefSize(size);
    setCubeSize(size);
    selectCase(null);
    onView('iso');
  };

  /** Drop the loaded case and go back to a solved cube to play with. */
  const freeplay = () => {
    selectCase(null);
    reset();
  };

  const scramble = () => {
    selectCase(null);
    shuffle();
  };

  return (
    <section className="setup">
      <div className="panel-title">Cube</div>

      {/* `activeView` is measured from the camera, so the indicator slides to
          Free the moment you orbit off the preset. */}
      <Segmented label="View" options={VIEW_OPTIONS} value={activeView} onChange={onView} />
      <Segmented label="Size" options={SIZE_OPTIONS} value={String(n)} onChange={changeSize} />

      <Segmented
        label="Top"
        variant="swatch"
        options={swatches(COLOR_NAMES)}
        value={top}
        onChange={setTop}
      />
      {/* Only the four colours adjacent to the chosen top can face front — the
          opposite colour is on the bottom and cannot be in two places. */}
      <Segmented
        label="Front"
        variant="swatch"
        options={swatches(validFronts(top))}
        value={front}
        onChange={setFront}
      />

      <div className="setup-row">
        <span className="hud-label">Play</span>
        <div className="hud-group">
          <button
            className="hud-btn"
            onClick={freeplay}
            disabled={busy}
            title="Solved cube, no algorithm loaded"
          >
            Freeplay
          </button>
          <button className="hud-btn" onClick={scramble} disabled={busy} title="Scramble the cube">
            Shuffle
          </button>
          <button
            className={`hud-btn ${autoRotate ? 'is-active' : ''}`}
            onClick={() => onAutoRotate(!autoRotate)}
            title="Slowly spin the cube"
          >
            Spin
          </button>
        </div>
      </div>
    </section>
  );
}
