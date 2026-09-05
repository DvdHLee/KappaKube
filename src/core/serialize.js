/**
 * Storing a cube state.
 *
 * Only position and orientation need saving: which colours a piece carries is
 * fixed by its identity, so the rest is rebuilt from a solved cube. Orientation
 * is written as an index into the 24 rotations rather than nine numbers, which
 * keeps a 5x5 down to a few hundred bytes.
 *
 * Everything read back is validated. A stored state can be stale (from an older
 * build) or corrupt, and a cube that fails to load should quietly fall back to
 * solved rather than break the app.
 */

import { createSolvedCube, latticeCoord, matMul } from './cube.js';
import { rotationMatrix } from './moves.js';

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** The 24 orientations a cubie can have, found by turning from the identity. */
export const ROTATIONS = (() => {
  const key = (m) => m.join(',');
  const found = new Map([[key(IDENTITY), IDENTITY]]);
  const generators = ['x', 'y', 'z'].map((axis) => rotationMatrix(axis, 1));

  const queue = [IDENTITY];
  while (queue.length) {
    const current = queue.shift();
    for (const generator of generators) {
      const next = matMul(generator, current);
      if (found.has(key(next))) continue;
      found.set(key(next), next);
      queue.push(next);
    }
  }
  return [...found.values()];
})();

const ROTATION_INDEX = new Map(ROTATIONS.map((m, i) => [m.join(','), i]));

export const SERIALIZED_VERSION = 1;

/** @returns {{v: number, n: number, pieces: number[][]} | null} */
export function serializeCube(cube) {
  const pieces = [];
  for (const cubie of cube.cubies) {
    const rotation = ROTATION_INDEX.get(cubie.rot.join(','));
    if (rotation === undefined) return null; // not one of the 24: refuse to store
    pieces.push([cubie.pos[0], cubie.pos[1], cubie.pos[2], rotation]);
  }
  return { v: SERIALIZED_VERSION, n: cube.n, pieces };
}

/**
 * Rebuild a cube, or null if the data cannot be trusted.
 *
 * Positions are checked to be a permutation of the solved cube's slots, so a
 * truncated or hand-edited entry cannot produce a cube with two pieces in one
 * place or a piece off the lattice.
 */
export function deserializeCube(data) {
  if (!data || data.v !== SERIALIZED_VERSION) return null;

  const n = data.n;
  if (!Number.isInteger(n) || n < 2 || n > 7) return null;
  if (!Array.isArray(data.pieces)) return null;

  const solved = createSolvedCube(n);
  if (data.pieces.length !== solved.cubies.length) return null;

  const valid = new Set();
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        valid.add([latticeCoord(i, n), latticeCoord(j, n), latticeCoord(k, n)].join(','));
      }
    }
  }

  const taken = new Set();
  const cubies = [];
  for (let i = 0; i < data.pieces.length; i++) {
    const piece = data.pieces[i];
    if (!Array.isArray(piece) || piece.length !== 4) return null;

    const [x, y, z, rotation] = piece;
    if (![x, y, z].every(Number.isInteger)) return null;
    if (!Number.isInteger(rotation) || rotation < 0 || rotation >= ROTATIONS.length) return null;

    const slot = `${x},${y},${z}`;
    if (!valid.has(slot) || taken.has(slot)) return null;
    taken.add(slot);

    cubies.push({
      id: solved.cubies[i].id,
      pos: [x, y, z],
      rot: ROTATIONS[rotation].slice(),
      stickers: solved.cubies[i].stickers,
    });
  }

  return { n, cubies };
}
