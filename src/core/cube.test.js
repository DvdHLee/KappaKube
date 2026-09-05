import { describe, expect, it } from 'vitest';
import {
  applyMat,
  createSolvedCube,
  cubesEqual,
  isSolved,
  latticeCoord,
  matMul,
  surfaceStickers,
  worldFaceOf,
  IDENTITY,
} from './cube.js';

describe('lattice', () => {
  it('centres coordinates on the origin with integer step 2', () => {
    expect([0, 1, 2].map((i) => latticeCoord(i, 3))).toEqual([-2, 0, 2]);
    expect([0, 1, 2, 3].map((i) => latticeCoord(i, 4))).toEqual([-3, -1, 1, 3]);
  });
});

describe('matrix helpers', () => {
  it('multiplies row-major matrices', () => {
    const a = [0, -1, 0, 1, 0, 0, 0, 0, 1]; // +90 about z
    expect(matMul(a, IDENTITY)).toEqual([...a]);
    // two quarter turns about z is a half turn
    expect(matMul(a, a)).toEqual([-1, 0, 0, 0, -1, 0, 0, 0, 1]);
  });

  it('applies a matrix to a vector', () => {
    const rotZ = [0, -1, 0, 1, 0, 0, 0, 0, 1];
    expect(applyMat(rotZ, [1, 0, 0])).toEqual([0, 1, 0]);
  });
});

describe('createSolvedCube', () => {
  // n^3 total slots minus the (n-2)^3 fully interior ones
  const expectedCubies = (n) => n ** 3 - Math.max(0, (n - 2) ** 3);

  it.each([2, 3, 4, 5, 7])('builds the right piece and sticker counts for %ix%i', (n) => {
    const cube = createSolvedCube(n);
    expect(cube.cubies).toHaveLength(expectedCubies(n));
    expect(surfaceStickers(cube)).toHaveLength(6 * n * n);
  });

  it('gives every piece a unique id and the identity orientation', () => {
    const cube = createSolvedCube(3);
    expect(new Set(cube.cubies.map((c) => c.id)).size).toBe(26);
    for (const cubie of cube.cubies) expect(cubie.rot).toEqual([...IDENTITY]);
  });

  it('produces 26 distinct colour sets for any size', () => {
    // 6 centres + 12 edges + 8 corners. Bounded regardless of n, which is what
    // lets the renderer cache one geometry per colour set.
    const setsFor = (n) =>
      new Set(createSolvedCube(n).cubies.map((c) => Object.values(c.stickers).sort().join('')));
    expect(setsFor(3).size).toBe(26);
    expect(setsFor(4).size).toBe(26);
    expect(setsFor(6).size).toBe(26);
  });

  it('puts exactly n*n stickers of one colour on each face', () => {
    const n = 3;
    const byFace = {};
    for (const { face, color } of surfaceStickers(createSolvedCube(n))) {
      byFace[face] ??= [];
      byFace[face].push(color);
    }
    expect(Object.keys(byFace).sort()).toEqual(['B', 'D', 'F', 'L', 'R', 'U']);
    for (const [face, colors] of Object.entries(byFace)) {
      expect(colors).toHaveLength(n * n);
      expect(new Set(colors)).toEqual(new Set([face]));
    }
  });
});

describe('worldFaceOf', () => {
  it('is the identity on a solved cube', () => {
    for (const cubie of createSolvedCube(3).cubies) {
      for (const local of Object.keys(cubie.stickers)) {
        expect(worldFaceOf(cubie, local)).toBe(local);
      }
    }
  });
});

describe('isSolved / cubesEqual', () => {
  it('recognises the solved state', () => {
    expect(isSolved(createSolvedCube(3))).toBe(true);
    expect(cubesEqual(createSolvedCube(3), createSolvedCube(3))).toBe(true);
  });

  it('distinguishes cubes of different sizes', () => {
    expect(cubesEqual(createSolvedCube(3), createSolvedCube(4))).toBe(false);
  });
});
