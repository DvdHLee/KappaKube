/**
 * Last-layer analysis: the vocabulary OLL and PLL are defined in.
 *
 * OLL and PLL are 3x3 concepts, so everything here requires n = 3 rather than
 * pretending to generalise.
 *
 * The important idea is that a *case* is an equivalence class of states, not a
 * single state:
 *   - an OLL case is the same however the U layer happens to be turned (AUF)
 *   - a PLL case is additionally the same whichever side you stand on (y)
 * So each key is computed by trying every such transformation and keeping the
 * smallest serialisation. That makes the keys canonical, which is what lets the
 * test suite prove a set of algorithms is complete and duplicate-free.
 */

import {
  AXIS_INDEX,
  FACES,
  FACE_NORMALS,
  applyMat,
  createSolvedCube,
  outerCoord,
  worldFaceOf,
} from './cube.js';
import { applyAlg, applyMove, rotationMatrix } from './moves.js';
import { parseAlg } from './notation.js';

const N = 3;
const OUTER = outerCoord(N); // 2

function require3x3(cube) {
  if (cube.n !== N) throw new Error(`Last-layer analysis is 3x3 only, got ${cube.n}x${cube.n}`);
}

const U_MOVE = parseAlg('U', N);
const Y_MOVE = parseAlg('y', N);

/** The piece occupying a lattice slot. */
export function cubieAt(cube, pos) {
  return cube.cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);
}

/** Colour currently on each face's centre — the reference a human recognises against. */
export function centreColours(cube) {
  const out = {};
  for (const face of FACES) {
    const normal = FACE_NORMALS[face];
    const centre = cubieAt(cube, [normal[0] * OUTER, normal[1] * OUTER, normal[2] * OUTER]);
    const local = Object.keys(centre.stickers).find((l) => worldFaceOf(centre, l) === face);
    out[face] = centre.stickers[local];
  }
  return out;
}

/** Which colour a piece shows on a given world face, or undefined if it has none there. */
export function colorOn(cubie, face) {
  for (const local in cubie.stickers) {
    if (worldFaceOf(cubie, local) === face) return cubie.stickers[local];
  }
  return undefined;
}

/** Is every sticker outside the U layer already home? */
export function isF2LSolved(cube) {
  require3x3(cube);
  const centres = centreColours(cube);
  for (const cubie of cube.cubies) {
    if (cubie.pos[1] === OUTER) continue; // U layer is the part being worked on
    for (const local in cubie.stickers) {
      const face = worldFaceOf(cubie, local);
      if (cubie.stickers[local] !== centres[face]) return false;
    }
  }
  return true;
}

/** Does the whole U face show one colour? */
export function isLLOriented(cube) {
  require3x3(cube);
  const target = centreColours(cube).U;
  for (const cubie of cube.cubies) {
    if (cubie.pos[1] !== OUTER) continue;
    if (colorOn(cubie, 'U') !== target) return false;
  }
  return true;
}

/**
 * The last layer seen from above: the 3x3 top face plus the twelve side stickers
 * around it, each given as the face letter whose colour it shows.
 *
 * Letters rather than colours, because the palette is the user's choice — the
 * renderer maps U/R/F/... through whichever scheme is on screen. Reported
 * against the current centres, so a reoriented cube still reads correctly.
 *
 * Grid is row-major with row 0 at the back and column 0 on the left, i.e. the
 * cube seen from above with F toward the viewer. This is derived from the cube
 * rather than hand-authored, so a diagram can never disagree with its case.
 */
export function topView(cube) {
  require3x3(cube);

  const centres = centreColours(cube);
  const asFace = {};
  for (const face of FACES) asFace[centres[face]] = face;

  const face = new Array(9).fill(null);
  const sides = {
    N: [null, null, null],
    E: [null, null, null],
    S: [null, null, null],
    W: [null, null, null],
  };

  for (const cubie of cube.cubies) {
    if (cubie.pos[1] !== OUTER) continue;

    const col = (cubie.pos[0] + OUTER) / 2;
    const row = (cubie.pos[2] + OUTER) / 2;

    face[row * 3 + col] = asFace[colorOn(cubie, 'U')];

    if (cubie.pos[2] === -OUTER) sides.N[col] = asFace[colorOn(cubie, 'B')];
    if (cubie.pos[2] === OUTER) sides.S[col] = asFace[colorOn(cubie, 'F')];
    if (cubie.pos[0] === -OUTER) sides.W[row] = asFace[colorOn(cubie, 'L')];
    if (cubie.pos[0] === OUTER) sides.E[row] = asFace[colorOn(cubie, 'R')];
  }

  return { face, sides };
}

/**
 * The OLL picture: the same layout reduced to "does this sticker show the top
 * colour". Derived from topView so the two can never drift apart.
 */
export function orientationPattern(cube) {
  const view = topView(cube);
  const up = (letter) => letter === 'U';
  return {
    face: view.face.map(up),
    sides: {
      N: view.sides.N.map(up),
      E: view.sides.E.map(up),
      S: view.sides.S.map(up),
      W: view.sides.W.map(up),
    },
  };
}

function serializePattern({ face, sides }) {
  const bits = (arr) => arr.map((b) => (b ? '1' : '0')).join('');
  return `${bits(face)}|${bits(sides.N)}${bits(sides.E)}${bits(sides.S)}${bits(sides.W)}`;
}

/**
 * Canonical identity of an OLL case: the smallest pattern over the four ways
 * the U layer can be pre-turned. Two states share a key exactly when they are
 * the same OLL case.
 */
export function ollKey(cube) {
  require3x3(cube);
  let best = null;
  let rotated = cube;
  for (let i = 0; i < 4; i++) {
    const key = serializePattern(orientationPattern(rotated));
    if (best === null || key < best) best = key;
    rotated = applyAlg(rotated, U_MOVE);
  }
  return best;
}

/**
 * Where every U-layer piece sits, described against the centre colours so the
 * result does not depend on the colour scheme.
 */
function permutationSignature(cube) {
  const centres = centreColours(cube);
  const colourToFace = {};
  for (const face of FACES) colourToFace[centres[face]] = face;

  const parts = [];
  for (const cubie of cube.cubies) {
    if (cubie.pos[1] !== OUTER) continue;
    const where = [];
    for (const face of FACES) {
      const colour = colorOn(cubie, face);
      if (colour !== undefined) where.push(`${face}>${colourToFace[colour]}`);
    }
    parts.push(`${cubie.pos.join(',')}:${where.sort().join('+')}`);
  }
  return parts.sort().join('|');
}

/**
 * Canonical identity of a PLL case: smallest signature over every AUF and every
 * choice of front face. A PLL case is the same case no matter how the U layer
 * is turned or which side of the cube you are standing on, and both of those
 * have to be quotiented out or mirror-image spellings of one algorithm look
 * like two different cases.
 */
export function pllKey(cube) {
  require3x3(cube);
  let best = null;
  let turned = cube;
  for (let a = 0; a < 4; a++) {
    let viewed = turned;
    for (let b = 0; b < 4; b++) {
      const key = permutationSignature(viewed);
      if (best === null || key < best) best = key;
      viewed = applyAlg(viewed, Y_MOVE);
    }
    turned = applyAlg(turned, U_MOVE);
  }
  return best;
}

// --- building last-layer states directly -----------------------------------

/**
 * 120 degree rotation about the body diagonal through a corner, which is what
 * twisting a corner in place means. Conjugating the (1,1,1) rotation by the
 * corner's sign pattern gives the right one for any corner, with entirely
 * integer entries.
 */
function cornerTwistMatrix(signs, times) {
  const cyclic = [0, 0, 1, 1, 0, 0, 0, 1, 0]; // x->y->z->x, 120 degrees about (1,1,1)
  const d = signs;

  // D.C.D is a rotation about D.(1,1,1), which is the corner we want — but only
  // by +120 when D is a proper rotation. Half the corners have det(D) = -1,
  // where D is improper and the conjugate turns by -120 instead. Folding det(D)
  // into the exponent makes "twist by 1" mean the same physical direction at
  // every corner, without which the four corners are not interchangeable and
  // the case count comes out wrong.
  const handedness = d[0] * d[1] * d[2];
  const steps = (((times * handedness) % 3) + 3) % 3;

  const conjugated = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) conjugated.push(d[r] * cyclic[r * 3 + c] * d[c]);
  }

  let m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let t = 0; t < steps; t++) m = multiply(conjugated, m);
  return m;
}

/**
 * 180 degree rotation that swaps an edge's two stickers: about the sum of its
 * outward normals. For v with two non-zero entries, v.v^T - I is that rotation
 * and is integer.
 */
function edgeFlipMatrix(v) {
  const m = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) m.push(v[r] * v[c] - (r === c ? 1 : 0));
  }
  return m;
}

function multiply(a, b) {
  const out = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

/** The four U-layer corner slots, and the four U-layer edge slots. */
export const LL_CORNERS = [
  [OUTER, OUTER, OUTER],
  [OUTER, OUTER, -OUTER],
  [-OUTER, OUTER, -OUTER],
  [-OUTER, OUTER, OUTER],
];

export const LL_EDGES = [
  [0, OUTER, OUTER],
  [OUTER, OUTER, 0],
  [0, OUTER, -OUTER],
  [-OUTER, OUTER, 0],
];

/**
 * A solved cube with the last layer's pieces twisted and flipped in place.
 *
 * `twists` are per-corner 0/1/2 and must sum to 0 mod 3; `flips` are per-edge
 * 0/1 and must sum to 0 mod 2. Those are exactly the constraints a real cube
 * obeys, and enumerating everything they allow gives all 216 last-layer
 * orientation states — the ground truth the OLL set is checked against.
 */
export function buildOrientationState(twists, flips) {
  const cube = createSolvedCube(N);
  const cubies = cube.cubies.map((c) => ({ ...c }));
  const at = (pos) =>
    cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);

  LL_CORNERS.forEach((pos, i) => {
    if (!twists[i]) return;
    const signs = [Math.sign(pos[0]), Math.sign(pos[1]), Math.sign(pos[2])];
    at(pos).rot = multiply(cornerTwistMatrix(signs, twists[i]), at(pos).rot);
  });

  LL_EDGES.forEach((pos, i) => {
    if (!flips[i]) return;
    const v = [Math.sign(pos[0]), Math.sign(pos[1]), Math.sign(pos[2])];
    at(pos).rot = multiply(edgeFlipMatrix(v), at(pos).rot);
  });

  return { n: N, cubies };
}

/** Every last-layer orientation a real cube can reach: 3^3 * 2^3 = 216 of them. */
export function enumerateOrientationStates() {
  const states = [];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      for (let c = 0; c < 3; c++) {
        const d = (3 - ((a + b + c) % 3)) % 3; // corner twists must sum to 0 mod 3
        for (let e = 0; e < 2; e++) {
          for (let f = 0; f < 2; f++) {
            for (let g = 0; g < 2; g++) {
              const h = (e + f + g) % 2; // edge flips must sum to 0 mod 2
              states.push(buildOrientationState([a, b, c, d], [e, f, g, h]));
            }
          }
        }
      }
    }
  }
  return states;
}

/**
 * Every last-layer permutation a real cube can reach, with orientation already
 * solved: 4! corner arrangements x 4! edge arrangements, halved by the parity
 * rule that the two permutations must have the same sign. 288 states, which
 * collapse to the 21 PLL cases plus the solved one.
 *
 * LL_CORNERS and LL_EDGES are both listed in y-rotation order, so moving a
 * piece from home slot j to slot i is exactly a y turn of (i - j) quarters —
 * which places it with the right orientation for free.
 */
export function enumeratePermutationStates() {
  const states = [];
  for (const corners of PERMUTATIONS) {
    for (const edges of PERMUTATIONS) {
      if (permutationSign(corners) !== permutationSign(edges)) continue; // parity
      states.push(buildPermutationState(corners, edges));
    }
  }
  return states;
}

/** `corners[i]` / `edges[i]` name the home slot of the piece placed in slot i. */
export function buildPermutationState(corners, edges) {
  const solved = createSolvedCube(N);
  const cubies = solved.cubies.map((c) => ({ ...c }));
  const index = new Map(cubies.map((c, i) => [c.pos.join(','), i]));

  const place = (slots, arrangement) => {
    const originals = slots.map((pos) => cubies[index.get(pos.join(','))]);
    return slots.map((pos, i) => {
      const from = arrangement[i];
      const turn = rotationMatrix('y', i - from);
      return { slotIndex: index.get(pos.join(',')), piece: originals[from], pos, turn };
    });
  };

  const moves = [...place(LL_CORNERS, corners), ...place(LL_EDGES, edges)];
  for (const { slotIndex, piece, pos, turn } of moves) {
    cubies[slotIndex] = {
      id: piece.id,
      pos: pos.slice(),
      rot: multiply(turn, piece.rot),
      stickers: piece.stickers,
    };
  }

  return { n: N, cubies };
}

const PERMUTATIONS = (() => {
  const out = [];
  const walk = (left, acc) => {
    if (left.length === 0) return out.push(acc);
    left.forEach((v, i) => walk([...left.slice(0, i), ...left.slice(i + 1)], [...acc, v]));
  };
  walk([0, 1, 2, 3], []);
  return out;
})();

function permutationSign(p) {
  let swaps = 0;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) swaps++;
  }
  return swaps % 2 === 0 ? 1 : -1;
}

/** Apply a single move to a cube — re-exported so data scripts need one import. */
export { applyMove, AXIS_INDEX, applyMat };
