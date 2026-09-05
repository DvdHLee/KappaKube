import { describe, expect, it } from 'vitest';
import { puzzles } from 'cubing/puzzles';
import { createSolvedCube, isSolved } from './cube.js';
import { applyAlg } from './moves.js';
import { parseAlg } from './notation.js';
import { randomScramble } from './scramble.js';
import { canSolve, toPatternData } from './kpattern.js';
import { solveCube } from './solver.js';

const state = (text, n) => applyAlg(createSolvedCube(n), parseAlg(text, n));

/**
 * The slot ordering and orientation conventions in kpattern.js were fitted to
 * cubing.js rather than read from a document, so this is the test that keeps
 * them honest: build a pattern from our model and compare it, field for field,
 * against the one cubing builds from the same algorithm.
 */
describe('pattern conversion agrees with cubing.js', () => {
  it.each([
    ['R', 3],
    ['U', 3],
    ['F', 3],
    ["R U R' U'", 3],
    ["F R U' R' U' R U R' F'", 3],
    ['U R2 F B R B2 R U2 L B2', 3],
    ['R', 2],
    ["R U R' U'", 2],
    ["R U2 R' F2 U R", 2],
  ])('%s on a %ix%i', async (text, n) => {
    const kpuzzle = await puzzles[`${n}x${n}x${n}`].kpuzzle();
    const theirs = kpuzzle.defaultPattern().applyAlg(text).patternData;
    const mine = toPatternData(state(text, n));

    for (const orbit of Object.keys(mine)) {
      expect(mine[orbit].pieces, `${orbit} pieces`).toEqual(theirs[orbit].pieces);
      expect(mine[orbit].orientation, `${orbit} orientation`).toEqual(theirs[orbit].orientation);
    }
  });

  it('reports a solved cube as solved', async () => {
    for (const n of [2, 3]) {
      const kpuzzle = await puzzles[`${n}x${n}x${n}`].kpuzzle();
      const mine = toPatternData(createSolvedCube(n));
      const theirs = kpuzzle.defaultPattern().patternData;
      for (const orbit of Object.keys(mine)) {
        expect(mine[orbit].pieces).toEqual(theirs[orbit].pieces);
        expect(mine[orbit].orientation).toEqual(theirs[orbit].orientation);
      }
    }
  });

  it('refuses sizes with no solver', () => {
    expect(canSolve(2)).toBe(true);
    expect(canSolve(3)).toBe(true);
    expect(canSolve(4)).toBe(false);
    expect(canSolve(5)).toBe(false);
    expect(() => toPatternData(createSolvedCube(4))).toThrow(/No solver/);
  });
});

/**
 * The end-to-end property that actually matters: whatever the solver returns,
 * playing it on our own cube has to finish solved. That covers the conversion,
 * the notation round trip and the solver together.
 */
describe('solutions solve our cube', () => {
  it.each([2, 3])(
    'a scrambled %ix%i',
    async (n) => {
      let seed = 2024;
      const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      for (let trial = 0; trial < 3; trial++) {
        const cube = applyAlg(createSolvedCube(n), randomScramble(n, random));
        const solution = await solveCube(cube);
        expect(solution.length).toBeGreaterThan(0);
        expect(isSolved(applyAlg(cube, solution)), `${n}x${n} trial ${trial}`).toBe(true);
      }
    },
    60000,
  );

  it('returns nothing for a cube that is already solved', async () => {
    expect(await solveCube(createSolvedCube(3))).toHaveLength(0);
    expect(await solveCube(createSolvedCube(2))).toHaveLength(0);
  }, 60000);

  it('2x2 solutions are within the 11 moves the puzzle can always be solved in', async () => {
    let seed = 5;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let trial = 0; trial < 5; trial++) {
      const cube = applyAlg(createSolvedCube(2), randomScramble(2, random));
      expect((await solveCube(cube)).length).toBeLessThanOrEqual(11);
    }
  }, 60000);
});
