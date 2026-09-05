import { parseAlg } from './notation.js';
import { canSolve, toPatternData } from './kpattern.js';

/**
 * Solving, via cubing.js.
 *
 * Everything is imported dynamically: the solver carries a WebAssembly payload
 * far larger than the rest of the app, and most sessions never press Solve. It
 * loads on first use and is cached after.
 *
 * The 2x2 search is exhaustive, so its solutions are optimal. The 3x3 uses
 * two-phase search, which is near-optimal — usually 19 to 21 moves against a
 * true optimum of 20 or fewer. Genuinely optimal 3x3 search needs pruning
 * tables too large to ship to a browser.
 */

let cached = null;

async function loadSolvers() {
  if (cached) return cached;
  const [{ puzzles }, { KPattern }, search] = await Promise.all([
    import('cubing/puzzles'),
    import('cubing/kpuzzle'),
    import('cubing/search'),
  ]);
  cached = { puzzles, KPattern, search, kpuzzles: {} };
  return cached;
}

async function kpuzzleFor(n, loaded) {
  const name = `${n}x${n}x${n}`;
  loaded.kpuzzles[name] ??= await loaded.puzzles[name].kpuzzle();
  return loaded.kpuzzles[name];
}

/**
 * A solution for this cube, as moves ready to play.
 * @returns {Promise<import('./moves.js').Move[]>} empty if already solved
 */
export async function solveCube(cube) {
  if (!canSolve(cube.n)) throw new Error(`No solver for a ${cube.n}x${cube.n}`);

  const loaded = await loadSolvers();
  const kpuzzle = await kpuzzleFor(cube.n, loaded);
  const pattern = new loaded.KPattern(kpuzzle, toPatternData(cube));

  const solution =
    cube.n === 2
      ? await loaded.search.experimentalSolve2x2x2(pattern)
      : await loaded.search.experimentalSolve3x3x3IgnoringCenters(pattern);

  return parseAlg(solution.toString(), cube.n);
}

export { canSolve };
