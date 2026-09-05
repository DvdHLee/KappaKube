import { parseAlg } from '../core/notation.js';
import { useCubeStore } from '../state/useCubeStore.js';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const SLICES = ['M', 'E', 'S'];
const ROTATIONS = ['x', 'y', 'z'];

/**
 * Direct turns, with every move spelled out rather than hidden behind a
 * modifier: each row is a move and its inverse, side by side.
 *
 * Shift-click and right-click still invert, as an accelerator for anyone who
 * finds it — but nothing is only reachable that way.
 */
export default function MovePad() {
  const n = useCubeStore((s) => s.n);
  const turn = useCubeStore((s) => s.turn);
  const busy = useCubeStore((s) => s.current !== null);

  // A 2x2 has no slice layers, so M/E/S drop out and only rotations remain.
  const groups = n > 2 ? [FACES, SLICES, ROTATIONS] : [FACES, ROTATIONS];

  const press = (notation, inverted) => {
    const [move] = parseAlg(inverted ? invert(notation) : notation, n);
    if (move) turn(move);
  };

  const button = (notation) => (
    <button
      key={notation}
      className="hud-btn hud-btn--move"
      disabled={busy}
      title={`${notation} — shift or right-click to invert`}
      onClick={(e) => press(notation, e.shiftKey)}
      onContextMenu={(e) => {
        e.preventDefault();
        press(notation, true);
      }}
    >
      {notation}
    </button>
  );

  return (
    <div className="movepad">
      {groups.map((group, i) => (
        <div key={i} className="movepad-grid">
          {group.flatMap((letter) => [button(letter), button(invert(letter))])}
        </div>
      ))}
    </div>
  );
}

function invert(notation) {
  return notation.endsWith("'") ? notation.slice(0, -1) : `${notation}'`;
}
