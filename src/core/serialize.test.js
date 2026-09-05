import { describe, expect, it } from 'vitest';
import { createSolvedCube, cubesEqual } from './cube.js';
import { applyAlg } from './moves.js';
import { parseAlg } from './notation.js';
import { randomScramble } from './scramble.js';
import { ROTATIONS, SERIALIZED_VERSION, deserializeCube, serializeCube } from './serialize.js';

describe('the rotation table', () => {
  it('holds the 24 orientations a cubie can take', () => {
    expect(ROTATIONS).toHaveLength(24);
    expect(new Set(ROTATIONS.map((m) => m.join(','))).size).toBe(24);
  });

  it('is entirely integer, so a stored orientation is exact', () => {
    for (const matrix of ROTATIONS) {
      expect(matrix).toHaveLength(9);
      expect(matrix.every(Number.isInteger)).toBe(true);
    }
  });
});

describe('round trip', () => {
  it.each([2, 3, 4, 5])('restores a scrambled %ix%i exactly', (n) => {
    let seed = 99;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const cube = applyAlg(createSolvedCube(n), randomScramble(n, random));
    const restored = deserializeCube(serializeCube(cube));
    expect(cubesEqual(restored, cube)).toBe(true);
  });

  it('survives a state with twisted centres', () => {
    // A T-perm leaves the U centre rotated; the stored orientation must keep it.
    const cube = applyAlg(createSolvedCube(3), parseAlg("R U R' U' R' F R2 U' R' U' R U R' F'"));
    const restored = deserializeCube(serializeCube(cube));
    expect(cubesEqual(restored, cube)).toBe(true);
  });

  it('stays small enough to keep in local storage', () => {
    const bytes = JSON.stringify(serializeCube(createSolvedCube(5))).length;
    expect(bytes).toBeLessThan(4000);
  });
});

/**
 * A stored cube can be stale or hand-edited. Anything that does not describe a
 * real cube has to come back as null so the app falls back to solved rather
 * than rendering something impossible.
 */
describe('rejecting bad data', () => {
  const solved = () => serializeCube(createSolvedCube(3));

  it.each([
    ['nothing', null],
    ['an empty object', {}],
    ['a future version', { ...solved(), v: SERIALIZED_VERSION + 1 }],
    ['an unsupported size', { ...solved(), n: 9 }],
    ['a non-integer size', { ...solved(), n: 3.5 }],
    ['the wrong number of pieces', { ...solved(), pieces: [[0, 0, 0, 0]] }],
    ['a malformed piece', { ...solved(), pieces: solved().pieces.map(() => [0, 0]) }],
  ])('rejects %s', (_label, data) => {
    expect(deserializeCube(data)).toBeNull();
  });

  it('rejects a rotation index outside the 24', () => {
    const data = solved();
    data.pieces[0] = [...data.pieces[0].slice(0, 3), 24];
    expect(deserializeCube(data)).toBeNull();
  });

  it('rejects a position off the lattice', () => {
    const data = solved();
    data.pieces[0] = [5, 0, 0, 0];
    expect(deserializeCube(data)).toBeNull();
  });

  it('rejects two pieces sharing a slot', () => {
    const data = solved();
    data.pieces[1] = [...data.pieces[0]];
    expect(deserializeCube(data)).toBeNull();
  });
});
