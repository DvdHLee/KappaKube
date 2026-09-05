import { COLORS } from '../theme.js';
import { COLOR_NAMES, validFronts } from '../core/scheme.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';
import Segmented from './Segmented.jsx';
import { useEnterFreeplay } from './useFreeplay.js';

/*
 * Spin joins the view modes rather than sitting apart as its own toggle: the
 * three are mutually exclusive in practice, since asking for a preset already
 * stops the cube drifting off it.
 */
const VIEW_OPTIONS = [
  { value: 'iso', label: 'Iso', title: 'Snap back to the standard angle' },
  { value: 'free', label: 'Free', title: 'Wherever you have dragged the camera' },
  { value: 'spin', label: 'Spin', title: 'Turn the cube slowly on its own' },
];

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const SIZE_OPTIONS = [
  { value: '2', label: '2x2' },
  { value: '3', label: '3x3' },
  { value: '4', label: '4x4' },
  { value: '5', label: '5x5' },
];

const swatches = (names) =>
  names.map((name) => ({ value: name, color: COLORS[name], title: name }));

export default function SetupPanel({ activeView, onView, autoRotate, onAutoRotate }) {
  const n = useCubeStore((s) => s.n);

  const top = usePrefsStore((s) => s.top);
  const front = usePrefsStore((s) => s.front);
  const setTop = usePrefsStore((s) => s.setTop);
  const setFront = usePrefsStore((s) => s.setFront);
  const setPrefSize = usePrefsStore((s) => s.setSize);
  const theme = usePrefsStore((s) => s.theme);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const setupOpen = usePrefsStore((s) => s.setupOpen);
  const setSetupOpen = usePrefsStore((s) => s.setSetupOpen);
  const enterFreeplay = useEnterFreeplay();

  const changeSize = (value) => {
    const size = Number(value);
    setPrefSize(size);
    // Each size keeps its own free cube, so switching brings that one back
    // rather than handing over a solved one.
    enterFreeplay(size);
    onView('iso');
  };

  const changeView = (mode) => {
    onAutoRotate(mode === 'spin');
    if (mode !== 'spin') onView(mode);
  };

  return (
    <section className="setup">
      <button
        type="button"
        className="section-toggle"
        aria-expanded={setupOpen}
        onClick={() => setSetupOpen(!setupOpen)}
      >
        <span className="panel-title">Cube</span>
        <span className="section-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {/*
       * Kept mounted and collapsed with CSS rather than unmounted, so the open
       * and close can animate. The 0fr/1fr grid trick gets a height transition
       * without having to measure the content.
       */}
      <div className="collapsible" data-open={setupOpen}>
        <div className="collapsible-inner">
          {/* `activeView` is measured from the camera, so the indicator slides
              to Free the moment you orbit off the preset. */}
          <Segmented
            label="View"
            options={VIEW_OPTIONS}
            value={autoRotate ? 'spin' : activeView}
            onChange={changeView}
          />
          <Segmented label="Size" options={SIZE_OPTIONS} value={String(n)} onChange={changeSize} />
          <Segmented label="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />

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
        </div>
      </div>
    </section>
  );
}
