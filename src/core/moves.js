/**
 * Move application. Size-agnostic: a move is a rotation of a set of layers, and
 * nothing here knows or cares whether n is 2, 3 or 7.
 *
 * @typedef {{ axis: 'x'|'y'|'z', layers: number[], amount: number }} Move
 *
 * `layers` holds lattice coordinates (not indices), so selection is an exact
 * integer equality test against a cubie's position.
 *
 * `amount` counts quarter turns about the **positive** axis direction, by the
 * right-hand rule. It is not "clockwise" — clockwise depends on which side you
 * are looking from, and encoding that here is how mirrored algorithms happen.
 * The face-letter-to-amount conversion lives in notation.js, in one table.
 */

import { AXIS_INDEX, applyMat, matMul } from './cube.js';

/** Right-handed 90 degree rotations. About x: y->z, z->-y, and so on. */
const QUARTER = {
  x: [1, 0, 0, 0, 0, -1, 0, 1, 0],
  y: [0, 0, 1, 0, 1, 0, -1, 0, 0],
  z: [0, -1, 0, 1, 0, 0, 0, 0, 1],
};

const IDENTITY_MAT = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * Quarter turns normalised to a canonical {-1, 1, 2}, or 0 for a no-op.
 * A half turn is its own inverse, so -2 collapses to 2.
 */
export function normalizeAmount(amount) {
  const q = ((amount % 4) + 4) % 4;
  if (q === 0) return 0;
  if (q === 3) return -1;
  return q; // 1 or 2
}

const matrixCache = new Map();

/** Rotation matrix for `amount` quarter turns about the positive `axis`. */
export function rotationMatrix(axis, amount) {
  const q = ((amount % 4) + 4) % 4;
  const key = axis + q;
  const hit = matrixCache.get(key);
  if (hit) return hit;

  let m = IDENTITY_MAT;
  for (let i = 0; i < q; i++) m = matMul(QUARTER[axis], m);
  matrixCache.set(key, m);
  return m;
}

/** Apply one move, returning a new cube. Untouched cubies are shared by reference. */
export function applyMove(cube, move) {
  const amount = normalizeAmount(move.amount);
  if (amount === 0) return cube;

  const rot = rotationMatrix(move.axis, amount);
  const axisIndex = AXIS_INDEX[move.axis];
  const layers = new Set(move.layers);

  return {
    n: cube.n,
    cubies: cube.cubies.map((cubie) => {
      if (!layers.has(cubie.pos[axisIndex])) return cubie;
      return {
        id: cubie.id,
        pos: applyMat(rot, cubie.pos),
        rot: matMul(rot, cubie.rot),
        stickers: cubie.stickers,
      };
    }),
  };
}

/** Apply a sequence of moves in order. */
export function applyAlg(cube, moves) {
  let out = cube;
  for (const move of moves) out = applyMove(out, move);
  return out;
}

export function invertMove(move) {
  const inverted = {
    axis: move.axis,
    layers: move.layers,
    amount: normalizeAmount(-move.amount),
  };
  // `spin` is the animation-direction hint from the parser; carry it through
  // inverted so a stepped-back half turn unwinds the way it wound.
  if (move.spin !== undefined) inverted.spin = -move.spin;
  return inverted;
}

/** Reverse the order and invert each move — the inverse of the whole sequence. */
export function invertAlg(moves) {
  const out = [];
  for (let i = moves.length - 1; i >= 0; i--) out.push(invertMove(moves[i]));
  return out;
}

/** Concatenate a sequence with itself `times` times. */
export function repeatAlg(moves, times) {
  const out = [];
  for (let i = 0; i < times; i++) out.push(...moves);
  return out;
}

export function movesEqual(a, b) {
  if (a.axis !== b.axis) return false;
  if (normalizeAmount(a.amount) !== normalizeAmount(b.amount)) return false;
  if (a.layers.length !== b.layers.length) return false;
  const left = [...a.layers].sort((p, q) => p - q);
  const right = [...b.layers].sort((p, q) => p - q);
  return left.every((v, i) => v === right[i]);
}
