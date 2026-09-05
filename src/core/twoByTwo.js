/**
 * 2x2 analysis, for the Ortega method.
 *
 * A 2x2 has no centres, so there is no fixed frame to describe a state against.
 * Everything here reads the frame off the DBL corner instead — in every Ortega
 * case that piece is oriented, so its three stickers name D, B and L, and the
 * opposites follow. Cases are then canonicalised over both AUF and the choice
 * of front, exactly as the 3x3 PLL keys are.
 */

import { FACES, FACE_NORMALS, applyMat, createSolvedCube, worldFaceOf } from './cube.js';
import { applyAlg } from './moves.js';
import { parseAlg } from './notation.js';

const N = 2;
const OUTER = 1; // lattice coords are -1 and 1

const OPPOSITE_FACE = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' };

const U_MOVE = parseAlg('U', N);
const Y_MOVE = parseAlg('y', N);
const D_MOVE = parseAlg('D', N);

function require2x2(cube) {
  if (cube.n !== N) throw new Error(`2x2 analysis only, got ${cube.n}x${cube.n}`);
}

function colorOn(cubie, face) {
  for (const local in cubie.stickers) {
    if (worldFaceOf(cubie, local) === face) return cubie.stickers[local];
  }
  return undefined;
}

function cubieAt(cube, pos) {
  return cube.cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);
}

/**
 * Colour -> face letter, taken from whichever piece is sitting at DBL.
 *
 * With no centres this is the only stable reference available, and it is enough
 * because Ortega only ever looks at states where that corner is oriented.
 */
export function referenceFrame(cube) {
  const corner = cubieAt(cube, [-OUTER, -OUTER, -OUTER]);
  const frame = {};
  for (const face of ['D', 'B', 'L']) {
    const colour = colorOn(corner, face);
    frame[colour] = face;
  }
  // The other three follow from the opposites.
  const known = { ...frame };
  for (const cubie of cube.cubies) {
    for (const local in cubie.stickers) {
      const colour = cubie.stickers[local];
      if (known[colour] !== undefined) continue;
      // Find the colour it is opposite to by elimination on the solved cube.
      frame[colour] = null;
    }
  }
  return completeFrame(frame);
}

/**
 * Fill in U, F and R from D, B and L using the solved cube's own pairings,
 * which is where "opposite" is defined.
 */
const SOLVED_OPPOSITE_COLOUR = (() => {
  const solved = createSolvedCube(N);
  const pairs = {};
  for (const face of FACES) {
    // On a solved cube the colour on a face is the face's own letter.
    pairs[face] = OPPOSITE_FACE[face];
  }
  void solved;
  return pairs;
})();

function completeFrame(partial) {
  const frame = {};
  for (const colour in partial) {
    if (partial[colour]) frame[colour] = partial[colour];
  }
  for (const colour in partial) {
    if (frame[colour]) continue;
    // colour is opposite to whichever known colour it pairs with
    const opposite = SOLVED_OPPOSITE_COLOUR[colour];
    if (frame[opposite]) frame[colour] = OPPOSITE_FACE[frame[opposite]];
  }
  return frame;
}

/** Does one face show a single colour? */
export function isFaceUniform(cube, face) {
  require2x2(cube);
  let seen;
  for (const cubie of cube.cubies) {
    const colour = colorOn(cubie, face);
    if (colour === undefined) continue;
    if (seen === undefined) seen = colour;
    else if (seen !== colour) return false;
  }
  return true;
}

/** Are both the top and bottom faces single-coloured — i.e. is orientation done? */
export function bothLayersOriented(cube) {
  return isFaceUniform(cube, 'U') && isFaceUniform(cube, 'D');
}

/** A full description of the cube against the DBL frame. */
function signature(cube) {
  const frame = referenceFrame(cube);
  const parts = [];
  for (const cubie of cube.cubies) {
    const where = [];
    for (const face of FACES) {
      const colour = colorOn(cubie, face);
      if (colour !== undefined) where.push(`${face}>${frame[colour] ?? '?'}`);
    }
    parts.push(`${cubie.pos.join(',')}:${where.sort().join('+')}`);
  }
  return parts.sort().join('|');
}

/**
 * Canonical case identity: smallest signature over every AUF and every choice
 * of front face. Two states share a key exactly when they are the same case to
 * a solver looking at the cube.
 */
export function caseKey(cube) {
  require2x2(cube);
  let best = null;
  let turned = cube;
  for (let a = 0; a < 4; a++) {
    let viewed = turned;
    for (let b = 0; b < 4; b++) {
      const key = signature(viewed);
      if (best === null || key < best) best = key;
      viewed = applyAlg(viewed, Y_MOVE);
    }
    turned = applyAlg(turned, U_MOVE);
  }
  return best;
}

// --- building states directly ----------------------------------------------

function multiply(a, b) {
  const out = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

/** See the 3x3 version: det(D) has to be folded in or the corners disagree. */
function cornerTwistMatrix(signs, times) {
  const cyclic = [0, 0, 1, 1, 0, 0, 0, 1, 0];
  const handedness = signs[0] * signs[1] * signs[2];
  const steps = (((times * handedness) % 3) + 3) % 3;

  const conjugated = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) conjugated.push(signs[r] * cyclic[r * 3 + c] * signs[c]);
  }

  let m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let t = 0; t < steps; t++) m = multiply(conjugated, m);
  return m;
}

export const U_CORNERS = [
  [OUTER, OUTER, OUTER],
  [OUTER, OUTER, -OUTER],
  [-OUTER, OUTER, -OUTER],
  [-OUTER, OUTER, OUTER],
];

/** A solved 2x2 with the top four corners twisted in place. */
export function buildOrientationState(twists) {
  const cube = createSolvedCube(N);
  const cubies = cube.cubies.map((c) => ({ ...c }));
  const at = (pos) =>
    cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);

  U_CORNERS.forEach((pos, i) => {
    if (!twists[i]) return;
    const signs = [Math.sign(pos[0]), Math.sign(pos[1]), Math.sign(pos[2])];
    at(pos).rot = multiply(cornerTwistMatrix(signs, twists[i]), at(pos).rot);
  });

  return { n: N, cubies };
}

/**
 * Every top-layer orientation reachable with the bottom layer already done:
 * three free twists and a fourth fixed by the sum-to-zero rule, so 27 states.
 */
export function enumerateTopOrientations() {
  const states = [];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      for (let c = 0; c < 3; c++) {
        const d = (3 - ((a + b + c) % 3)) % 3;
        states.push(buildOrientationState([a, b, c, d]));
      }
    }
  }
  return states;
}

/**
 * The last layer of a 2x2 seen from above: four cells and eight side stickers,
 * each as the face letter whose colour it shows. Same contract as the 3x3
 * version so one diagram component can draw either.
 */
export function topView(cube) {
  require2x2(cube);
  const frame = referenceFrame(cube);

  const face = new Array(4).fill(null);
  const sides = { N: [null, null], E: [null, null], S: [null, null], W: [null, null] };

  for (const cubie of cube.cubies) {
    if (cubie.pos[1] !== OUTER) continue;
    const col = (cubie.pos[0] + OUTER) / 2;
    const row = (cubie.pos[2] + OUTER) / 2;

    face[row * 2 + col] = frame[colorOn(cubie, 'U')];
    if (cubie.pos[2] === -OUTER) sides.N[col] = frame[colorOn(cubie, 'B')];
    if (cubie.pos[2] === OUTER) sides.S[col] = frame[colorOn(cubie, 'F')];
    if (cubie.pos[0] === -OUTER) sides.W[row] = frame[colorOn(cubie, 'L')];
    if (cubie.pos[0] === OUTER) sides.E[row] = frame[colorOn(cubie, 'R')];
  }

  return { face, sides };
}

/**
 * The OLL picture for a 2x2: which of the twelve top-layer stickers show the
 * top colour.
 *
 * Orientation only — an OLL case says nothing about where the pieces are, so
 * this deliberately throws the permutation away. (Using the full signature here
 * was a bug: it split each case into several.)
 *
 * With no centres, the top colour is read as the opposite of whatever the
 * solved bottom face is showing.
 */
export function ortegaOllKey(cube) {
  require2x2(cube);

  const bottom = colorOn(cubieAt(cube, [-OUTER, -OUTER, -OUTER]), 'D');
  const up = SOLVED_OPPOSITE_COLOUR[bottom];

  let best = null;
  let turned = cube;
  for (let a = 0; a < 4; a++) {
    const bits = [];
    for (const cubie of turned.cubies) {
      if (cubie.pos[1] !== OUTER) continue;
      const col = (cubie.pos[0] + OUTER) / 2;
      const row = (cubie.pos[2] + OUTER) / 2;
      bits.push(`${row}${col}${colorOn(cubie, 'U') === up ? 1 : 0}`);
      for (const face of ['B', 'F', 'L', 'R']) {
        if (colorOn(cubie, face) === undefined) continue;
        bits.push(`${row}${col}${face}${colorOn(cubie, face) === up ? 1 : 0}`);
      }
    }
    const key = bits.sort().join('');
    if (best === null || key < best) best = key;
    turned = applyAlg(turned, U_MOVE);
  }
  return best;
}

/**
 * Canonical identity of a PBL case.
 *
 * Wider than the OLL key, because before running a PBL algorithm you may turn
 * the cube over as well as around, and you may pre-align either layer. So the
 * quotient is: the eight views that keep the U-D axis vertical, times any AUF
 * on the top, times any on the bottom. Without the flip and the D turns, the
 * five cases Ortega actually teaches would come out as many more.
 */
export function pblKey(cube) {
  require2x2(cube);
  const flips = [[], parseAlg('z2', N)];
  let best = null;

  for (const flip of flips) {
    let viewed = applyAlg(cube, flip);
    for (let y = 0; y < 4; y++) {
      let top = viewed;
      for (let u = 0; u < 4; u++) {
        let both = top;
        for (let d = 0; d < 4; d++) {
          const key = signature(both);
          if (best === null || key < best) best = key;
          both = applyAlg(both, D_MOVE);
        }
        top = applyAlg(top, U_MOVE);
      }
      viewed = applyAlg(viewed, Y_MOVE);
    }
  }
  return best;
}

export { applyMat, FACE_NORMALS };
