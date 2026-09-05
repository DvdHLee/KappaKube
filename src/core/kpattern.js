import { FACE_NORMALS, outerCoord, worldFaceOf } from './cube.js';

/**
 * Translating a cube into the pattern format cubing.js's solvers expect.
 *
 * The slot orderings and orientation conventions below were derived from
 * cubing.js itself rather than read off a document: each slot was identified by
 * which face turns disturb it, and the orientation rules were fitted until the
 * conversion reproduced cubing's own patterns exactly. src/core/kpattern.test.js
 * re-checks that agreement, so a change on their side shows up as a failure
 * rather than as wrong solutions.
 */

/** Corner slots, in cubing's order, named by the faces that meet there. */
const CORNER_SLOTS = ['URF', 'URB', 'ULB', 'UFL', 'RFD', 'FDL', 'DLB', 'RDB'].map((s) =>
  s.split(''),
);

/** Edge slots, in cubing's order. */
const EDGE_SLOTS = ['UF', 'UR', 'UB', 'UL', 'FD', 'RD', 'DB', 'DL', 'RF', 'FL', 'RB', 'LB'].map(
  (s) => s.split(''),
);

/** Sizes with a solver behind them. */
export const SOLVABLE_SIZES = [2, 3];

export function canSolve(n) {
  return SOLVABLE_SIZES.includes(n);
}

/**
 * Reference face for orientation: U/D outranks F/B, which outranks L/R. The
 * same ordering names a piece's reference sticker, and an edge counts as
 * oriented when the two coincide.
 */
const referenceOf = (faces) =>
  faces.find((f) => f === 'U' || f === 'D') ??
  faces.find((f) => f === 'F' || f === 'B') ??
  faces[0];

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A corner's three faces, right-handed, starting from its U/D face. */
function cornerAxes(faces) {
  const primary = referenceOf(faces);
  const [b, c] = faces.filter((f) => f !== primary);
  return dot(cross(FACE_NORMALS[primary], FACE_NORMALS[b]), FACE_NORMALS[c]) > 0
    ? [primary, b, c]
    : [primary, c, b];
}

const slotPosition = (faces, n) => {
  const outer = outerCoord(n);
  const pos = [0, 0, 0];
  for (const face of faces) FACE_NORMALS[face].forEach((v, i) => (pos[i] += v * outer));
  return pos;
};

const pieceAt = (cube, pos) =>
  cube.cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);

const colourOn = (cubie, face) => {
  for (const local in cubie.stickers) {
    if (worldFaceOf(cubie, local) === face) return cubie.stickers[local];
  }
  return undefined;
};

/** Which slot a piece belongs in, found by its colour set. */
const homeIndex = (colours, slots) => {
  const key = [...colours].sort().join('');
  return slots.findIndex((faces) => [...faces].sort().join('') === key);
};

function cornerOrbit(cube) {
  const pieces = [];
  const orientation = [];
  for (const faces of CORNER_SLOTS) {
    const cubie = pieceAt(cube, slotPosition(faces, cube.n));
    pieces.push(homeIndex(Object.values(cubie.stickers), CORNER_SLOTS));
    // How far the U/D-coloured sticker sits from the slot's U/D face.
    const twist = cornerAxes(faces).findIndex((f) => 'UD'.includes(colourOn(cubie, f)));
    orientation.push((3 - twist) % 3);
  }
  return { pieces, orientation };
}

function edgeOrbit(cube) {
  const pieces = [];
  const orientation = [];
  for (const faces of EDGE_SLOTS) {
    const cubie = pieceAt(cube, slotPosition(faces, cube.n));
    const colours = Object.values(cubie.stickers);
    pieces.push(homeIndex(colours, EDGE_SLOTS));
    orientation.push(colourOn(cubie, referenceOf(faces)) === referenceOf(colours) ? 0 : 1);
  }
  return { pieces, orientation };
}

/**
 * Pattern data for cubing.js. Centres are always reported solved: the 3x3
 * solver ignores them, and a 2x2 has none.
 */
export function toPatternData(cube) {
  if (cube.n === 2) return { CORNERS: cornerOrbit(cube) };
  if (cube.n === 3) {
    return {
      CORNERS: cornerOrbit(cube),
      EDGES: edgeOrbit(cube),
      CENTERS: { pieces: [0, 1, 2, 3, 4, 5], orientation: [0, 0, 0, 0, 0, 0] },
    };
  }
  throw new Error(`No solver for a ${cube.n}x${cube.n}`);
}
