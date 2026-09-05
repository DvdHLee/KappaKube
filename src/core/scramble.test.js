import { describe, expect, it } from 'vitest';
import { createSolvedCube, isSolved, worldFaceOf } from './cube.js';
import { applyAlg } from './moves.js';
import { randomScramble, scrambleLength, turnDepths } from './scramble.js';

/** Deterministic, so a failure can be reproduced. */
const seeded = (seed) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const kindOf = (pos, n) => {
  const outer = n - 1;
  const edges = pos.filter((v) => Math.abs(v) === outer).length;
  return edges === 3 ? 'corner' : edges === 2 ? 'edge' : 'centre';
};

const wrongByKind = (cube) => {
  const counts = { corner: 0, edge: 0, centre: 0 };
  for (const cubie of cube.cubies) {
    for (const local in cubie.stickers) {
      if (cubie.stickers[local] !== worldFaceOf(cubie, local)) counts[kindOf(cubie.pos, cube.n)]++;
    }
  }
  return counts;
};

describe('turn depths', () => {
  it('is outer turns only on small cubes, and adds wide turns from 4x4', () => {
    expect(turnDepths(2)).toEqual([1]);
    expect(turnDepths(3)).toEqual([1]);
    expect(turnDepths(4)).toEqual([1, 2]);
    expect(turnDepths(5)).toEqual([1, 2]);
    // Turning more than half the cube is the same as turning fewer layers from
    // the opposite face, so there is nothing beyond that.
    expect(turnDepths(6)).toEqual([1, 2, 3]);
  });
});

describe('scrambles', () => {
  it.each([2, 3, 4, 5])('produce a reachable %ix%i state', (n) => {
    const cube = applyAlg(createSolvedCube(n), randomScramble(n, seeded(11)));
    expect(cube.cubies).toHaveLength(createSolvedCube(n).cubies.length);
    expect(isSolved(cube)).toBe(false);
  });

  it.each([2, 3, 4, 5])('are the right length for a %ix%i', (n) => {
    expect(randomScramble(n, seeded(3))).toHaveLength(scrambleLength(n));
  });

  it('never turns the same face twice running', () => {
    for (const n of [2, 3, 4, 5]) {
      const moves = randomScramble(n, seeded(n * 7));
      for (let i = 1; i < moves.length; i++) {
        const sameFace =
          moves[i].axis === moves[i - 1].axis &&
          Math.sign(moves[i].layers[0]) === Math.sign(moves[i - 1].layers[0]);
        expect(sameFace, `moves ${i - 1} and ${i} on a ${n}x${n}`).toBe(false);
      }
    }
  });
});

/**
 * The bug this guards against: with outer turns alone a big cube comes out with
 * its centres and wings untouched — scrambled as though it were a 3x3.
 */
describe('big cubes are scrambled as big cubes', () => {
  it.each([4, 5])('a %ix%i has its centres disturbed', (n) => {
    const cube = applyAlg(createSolvedCube(n), randomScramble(n, seeded(21)));
    expect(wrongByKind(cube).centre).toBeGreaterThan(0);
  });

  it.each([4, 5])('a %ix%i scramble uses wide turns', (n) => {
    const widths = new Set(randomScramble(n, seeded(5)).map((m) => m.layers.length));
    expect(widths.has(2)).toBe(true);
  });

  it.each([2, 3])('a %ix%i uses outer turns only', (n) => {
    const widths = new Set(randomScramble(n, seeded(5)).map((m) => m.layers.length));
    expect([...widths]).toEqual([1]);
  });

  it('leaves a 3x3 with its centres on their own faces', () => {
    // A 3x3 face turn spins a centre in place but never moves it, so any
    // displaced centre would mean the scramble had reached past the outer layer.
    const cube = applyAlg(createSolvedCube(3), randomScramble(3, seeded(9)));
    expect(wrongByKind(cube).centre).toBe(0);
  });
});
