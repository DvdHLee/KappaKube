import { parseAlg } from '../core/notation.js';
import { useCubeStore } from '../state/useCubeStore.js';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const SLICES = ['M', 'E', 'S'];
const WIDE = ['Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw'];
const INNER = ['2U', '2D', '2L', '2R', '2F', '2B'];
const ROTATIONS = ['x', 'y', 'z'];

/**
 * Which turns a cube of this size actually has.
 *
 * M/E/S name the single middle layer, so they only appear on an odd cube. From
 * 4x4 up there are also wide turns and individually addressable inner slices,
 * which is what big-cube algorithms are written in. A 5x5 has both: a true
 * middle layer and an inner slice either side of it.
 */
function turnsFor(n) {
  const groups = [FACES];
  if (n >= 4) groups.push(WIDE, INNER);
  if (n >= 3 && n % 2 === 1) groups.push(SLICES);
  groups.push(ROTATIONS);
  return groups;
}

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

  const groups = turnsFor(n);

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
