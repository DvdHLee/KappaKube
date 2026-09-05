import { COLORS } from '../theme.js';
import { paintStatus } from '../core/paint.js';
import { currentScheme, usePrefsStore } from '../state/usePrefsStore.js';
import { useCubeStore } from '../state/useCubeStore.js';
import Segmented from './Segmented.jsx';

/**
 * Paint mode: pick a colour, then click stickers.
 *
 * The engine refuses anything a real cube could not show, so this panel mostly
 * reports — how much is left, and why a click was turned away. Apply becomes
 * available only once the painting describes a complete, reachable cube.
 */
export default function PaintPanel() {
  const painting = useCubeStore((s) => s.painting);
  const paintColour = useCubeStore((s) => s.paintColour);
  const setPaintColour = useCubeStore((s) => s.setPaintColour);
  const paintError = useCubeStore((s) => s.paintError);
  const cancelPainting = useCubeStore((s) => s.cancelPainting);
  const applyPainting = useCubeStore((s) => s.applyPainting);

  const top = usePrefsStore((s) => s.top);
  const front = usePrefsStore((s) => s.front);

  if (!painting) return null;

  const scheme = currentScheme({ top, front });
  const status = paintStatus(painting);
  const left = status.total - status.painted;

  // Offered in face order but shown in the colour actually on that face, since
  // the colour is what the user is matching against their own cube.
  const options = ['U', 'D', 'F', 'B', 'R', 'L'].map((face) => ({
    value: face,
    color: COLORS[scheme[face]],
    title: scheme[face],
  }));

  return (
    <div className="paintbar">
      <Segmented
        label="Colour"
        variant="swatch"
        options={options}
        value={paintColour}
        onChange={setPaintColour}
      />

      <div className="paintbar-row">
        <span className="paintbar-status">
          {left > 0 ? `${left} sticker${left === 1 ? '' : 's'} left` : 'Every piece placed'}
        </span>
        <button className="hud-btn" onClick={cancelPainting}>
          Cancel
        </button>
        <button
          className="hud-btn hud-btn--primary"
          disabled={!status.complete || !status.reachable}
          title={status.complete ? 'Use this as the cube' : 'Fill in the rest first'}
          onClick={() => applyPainting()}
        >
          Apply
        </button>
      </div>

      <p className={`paintbar-note ${paintError ? 'is-error' : ''}`}>
        {paintError ??
          'Click a sticker to colour it. Anything that follows from what you have painted is filled in for you.'}
      </p>
    </div>
  );
}
