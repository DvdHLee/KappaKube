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
 * A move on the outer layer of `face`, `turns` quarter turns clockwise.
 * Wide moves are left out: on a big cube they would just reorient it.
 */
function faceMove(face, turns, n) {
  const sign = FACE_SIGN[face];
  return {
    axis: FACE_AXIS[face],
    layers: [sign * outerCoord(n)],
    amount: normalizeAmount(-sign * turns),
    spin: normalizeAmount(-sign * turns),
  };
}

/**
 * @param {number} n cube size
 * @param {() => number} random injectable for deterministic tests
 * @returns {import('./moves.js').Move[]}
 */
export function randomScramble(n, random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const length = scrambleLength(n);

  const faces = [];
  while (faces.length < length) {
    const face = pick(FACES);

    // Never turn the same face twice running — the pair collapses to one move.
    const last = faces[faces.length - 1];
    if (last === face) continue;

    // On the same axis, A B A also collapses: B commutes with A, so the two A
    // turns end up adjacent. Reject the third move rather than the second.
    const beforeLast = faces[faces.length - 2];
    if (last && FACE_AXIS[last] === FACE_AXIS[face] && beforeLast === face) continue;

    faces.push(face);
  }

  return faces.map((face) => faceMove(face, pick(AMOUNTS), n));
}
