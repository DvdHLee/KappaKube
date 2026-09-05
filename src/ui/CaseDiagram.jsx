import { COLORS } from '../theme.js';
import { currentScheme, usePrefsStore } from '../state/usePrefsStore.js';

/**
 * The standard top-down recognition diagram: the 3x3 last layer seen from above
 * with F toward the bottom, ringed by the twelve side stickers.
 *
 * OLL shows two colours — the top colour where a sticker is already oriented,
 * grey everywhere else — because orientation is the only thing that matters for
 * recognising the case. PLL is fully coloured, since permutation is read from
 * the side stickers.
 *
 * Colours come from the user's chosen scheme, so the diagram always matches the
 * cube on screen.
 */

const GAP = 1.5;
const TAB = 3.5;
const ORIGIN = TAB + GAP;
// A 2x2 diagram keeps the same overall footprint as a 3x3, with bigger cells,
// so the two sit at a consistent size in the same list.
const EXTENT = 10 * 3 + GAP * 2; // 33
const SIZE = EXTENT + ORIGIN * 2; // 43

export default function CaseDiagram({ view, kind, size = 34, className = '' }) {
  const top = usePrefsStore((s) => s.top);
  const front = usePrefsStore((s) => s.front);
  const scheme = currentScheme({ top, front });

  const dim = Math.sqrt(view.face.length); // 2 or 3
  const cell = (EXTENT - GAP * (dim - 1)) / dim;
  const at = (i) => ORIGIN + i * (cell + GAP);

  // Orientation steps show two colours: is this the top colour, or not. The
  // permutation steps need every face, since that is what you read.
  const orientationOnly = kind === 'OLL' || kind === 'Ortega OLL';
  // The unoriented grey is a CSS token, so it follows the theme.
  const fill = (letter) => {
    if (orientationOnly) return letter === 'U' ? COLORS[scheme.U] : 'var(--unoriented)';
    return COLORS[scheme[letter]] ?? 'var(--unoriented)';
  };

  const cells = view.face.map((letter, i) => (
    <rect
      key={`f${i}`}
      x={at(i % dim)}
      y={at(Math.floor(i / dim))}
      width={cell}
      height={cell}
      rx={1.6}
      fill={fill(letter)}
    />
  ));

  // Three tabs per side, indexed the same way as the grid they sit against.
  const tabs = [
    ...view.sides.N.map((letter, i) => ({ key: `n${i}`, x: at(i), y: 0, w: cell, h: TAB, letter })),
    ...view.sides.S.map((letter, i) => ({
      key: `s${i}`,
      x: at(i),
      y: SIZE - TAB,
      w: cell,
      h: TAB,
      letter,
    })),
    ...view.sides.W.map((letter, i) => ({ key: `w${i}`, x: 0, y: at(i), w: TAB, h: cell, letter })),
    ...view.sides.E.map((letter, i) => ({
      key: `e${i}`,
      x: SIZE - TAB,
      y: at(i),
      w: TAB,
      h: cell,
      letter,
    })),
  ].map(({ key, x, y, w, h, letter }) => (
    <rect key={key} x={x} y={y} width={w} height={h} rx={1.1} fill={fill(letter)} />
  ));

  return (
    <svg
      className={`diagram ${className}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${kind} case`}
    >
      {tabs}
      {cells}
    </svg>
  );
}
