/**
 * Random-move scrambles.
 *
 * Every state produced is reachable by construction — it is literally the
 * result of turning a solved cube — so there is no way to generate an
 * impossible position. That is the property that matters here.
 *
 * It is not a WCA random-*state* scramble, which samples uniformly over all
 * positions and needs a solver to generate. Swapping this out for cubing.js
 * later changes nothing above it: the signature stays Move[].
 */

import { FACE_AXIS, FACE_SIGN, outerCoord } from './cube.js';
import { normalizeAmount } from './moves.js';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const AMOUNTS = [1, -1, 2];

/** Sensible lengths: enough to look thoroughly mixed at each size. */
const LENGTHS = { 2: 11, 3: 25, 4: 40, 5: 60 };

export function scrambleLength(n) {
  return LENGTHS[n] ?? 20 * (n - 1);
}

/**
 * How many layers a turn may take in from a face.
 *
 * Outer turns alone leave every inner slice untouched, so a big cube comes out
 * with its centres and wings still solved — a 4x4 scrambled as though it were a
 * 3x3. Wide turns are what actually mix the pieces a big cube adds. Half the
 * cube is the useful limit: turning more layers than that is the same as
 * turning fewer from the opposite face.
 */
export function turnDepths(n) {
  return Array.from({ length: Math.floor(n / 2) }, (_, i) => i + 1);
}

/**
 * A turn of the outermost `depth` layers at `face`, `turns` quarter turns
 * clockwise.
 */
function faceMove(face, depth, turns, n) {
  const sign = FACE_SIGN[face];
  const outer = outerCoord(n);
  const layers = [];
  for (let k = 0; k < depth; k++) layers.push(sign * (outer - 2 * k));

  const amount = normalizeAmount(-sign * turns);
  return { axis: FACE_AXIS[face], layers, amount, spin: amount };
}

/**
 * @param {number} n cube size
 * @param {() => number} random injectable for deterministic tests
 * @returns {import('./moves.js').Move[]}
 */
export function randomScramble(n, random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const length = scrambleLength(n);
  const depths = turnDepths(n);

  const faces = [];
  while (faces.length < length) {
    const face = pick(FACES);

    // Never turn the same face twice running, whatever the widths — the pair
    // collapses into a single turn.
    const last = faces[faces.length - 1];
    if (last === face) continue;

    // On the same axis, A B A also collapses: B commutes with A, so the two A
    // turns end up adjacent. Reject the third move rather than the second.
    const beforeLast = faces[faces.length - 2];
    if (last && FACE_AXIS[last] === FACE_AXIS[face] && beforeLast === face) continue;

    faces.push(face);
  }

  return faces.map((face) => faceMove(face, pick(depths), pick(AMOUNTS), n));
}
