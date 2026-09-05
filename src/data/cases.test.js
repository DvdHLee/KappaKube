import { describe, expect, it } from 'vitest';
import { createSolvedCube } from '../core/cube.js';
import { applyAlg } from '../core/moves.js';
import { parseAlg } from '../core/notation.js';
import {
  centreColours,
  enumerateOrientationStates,
  enumeratePermutationStates,
  isF2LSolved,
  isLLOriented,
  ollKey,
  pllKey,
} from '../core/lastLayer.js';
import {
  bothLayersOriented,
  enumerateTopOrientations,
  isFaceUniform,
  ortegaOllKey,
  pblKey,
} from '../core/twoByTwo.js';
import { createSolvedCube as solvedCube, isSolved, worldFaceOf } from '../core/cube.js';
import { formatAlg } from '../core/notation.js';
import { algIndexFor } from '../ui/useLoadCase.js';
import {
  CASES,
  CASES_BY_ID,
  filterSections,
  flattenSections,
  matchesSearch,
  sectionsFor,
  stateForAlg,
} from './cases.js';

const solved = () => createSolvedCube(3);
const STANDARD_CENTRES = JSON.stringify(centreColours(solved()));

const oll = CASES.filter((c) => c.kind === 'OLL');
const pll = CASES.filter((c) => c.kind === 'PLL');
const bigCube = CASES.filter((c) => c.n === 3);
const ortegaOll = CASES.filter((c) => c.kind === 'Ortega OLL');
const ortegaPbl = CASES.filter((c) => c.kind === 'PBL');

describe('the library', () => {
  it('has the full 3x3 and 2x2 sets with unique ids', () => {
    expect(oll).toHaveLength(57);
    expect(pll).toHaveLength(21);
    expect(ortegaOll).toHaveLength(7);
    expect(ortegaPbl).toHaveLength(5);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
  });

  it('lists every case exactly once in the menu for its cube size', () => {
    for (const [n, expected] of [
      [3, 78],
      [2, 12],
      [4, 2],
      [5, 1],
    ]) {
      const listed = sectionsFor(n).flatMap((s) => s.groups.flatMap((g) => g.cases));
      expect(listed, `${n}x${n}`).toHaveLength(expected);
      expect(new Set(listed.map((c) => c.id)).size).toBe(expected);
      expect(listed.every((c) => c.n === n)).toBe(true);
    }
  });

  it('offers no library for sizes that have none yet', () => {
    expect(sectionsFor(6)).toEqual([]);
  });

  it('gives every case at least one algorithm and a setup', () => {
    for (const c of CASES) {
      expect(c.algs.length, c.id).toBeGreaterThan(0);
      expect(c.setup.length, c.id).toBeGreaterThan(0);
    }
  });
});

/**
 * Per-algorithm sanity. These catch a mistyped move: an algorithm that reaches
 * into F2L, leaves the cube reoriented, or (for PLL) disturbs orientation is
 * not a last-layer algorithm at all.
 */
describe('every algorithm is a well-formed last-layer algorithm', () => {
  it.each(bigCube.map((c) => [c.id, c]))('%s', (_id, testCase) => {
    for (const alg of testCase.algs) {
      const state = stateForAlg(alg);

      // Running the algorithm from its own setup state must solve the cube.
      const result = applyAlg(state, parseAlg(alg, 3));
      expect(isF2LSolved(result), `${alg} does not solve`).toBe(true);
      expect(isLLOriented(result), `${alg} does not solve`).toBe(true);

      expect(isF2LSolved(state), `${alg} reaches into F2L`).toBe(true);

      // No net whole-cube rotation: a last-layer algorithm puts the centres back.
      expect(JSON.stringify(centreColours(state)), `${alg} moves the centres`).toBe(
        STANDARD_CENTRES,
      );

      // PLL only permutes; it must not change orientation.
      if (testCase.kind === 'PLL') {
        expect(isLLOriented(state), `${alg} changes orientation`).toBe(true);
      }
    }
  });

  it('alternate algorithms solve the same case as the primary', () => {
    for (const testCase of bigCube) {
      const key = testCase.kind === 'OLL' ? ollKey : pllKey;
      const primary = key(stateForAlg(testCase.algs[0]));
      for (const alt of testCase.algs.slice(1)) {
        expect(key(stateForAlg(alt)), `${testCase.id}: ${alt}`).toBe(primary);
      }
    }
  });
});

/**
 * The completeness proof, and the real reason the analysis layer exists.
 *
 * The state space is enumerated independently of the algorithms, so if any one
 * algorithm were wrong its case would either collide with another case or leave
 * a hole in the coverage. Passing both halves means all 78 are right — no
 * algorithm here is trusted on the strength of having been typed correctly.
 */
describe('the set is complete and duplicate-free', () => {
  it('the 57 OLL cases are exactly the 57 unsolved orientation classes', () => {
    const keys = oll.map((c) => ollKey(stateForAlg(c.algs[0])));
    expect(new Set(keys).size).toBe(57); // no two cases are the same case

    const everyClass = new Set(enumerateOrientationStates().map(ollKey));
    everyClass.delete(ollKey(solved()));
    expect(everyClass.size).toBe(57);
    expect(new Set(keys)).toEqual(everyClass); // nothing missing, nothing invented
  });

  it('the 21 PLL cases are exactly the 21 unsolved permutation classes', () => {
    const keys = pll.map((c) => pllKey(stateForAlg(c.algs[0])));
    expect(new Set(keys).size).toBe(21);

    const everyClass = new Set(enumeratePermutationStates().map(pllKey));
    everyClass.delete(pllKey(solved()));
    expect(everyClass.size).toBe(21);
    expect(new Set(keys)).toEqual(everyClass);
  });
});

describe('derived data', () => {
  it('a setup reproduces the case it belongs to', () => {
    for (const testCase of bigCube) {
      const viaSetup = applyAlg(solved(), parseAlg(testCase.setup, 3));
      const viaInverse = stateForAlg(testCase.algs[0]);
      const key = testCase.kind === 'OLL' ? ollKey : pllKey;
      expect(key(viaSetup), testCase.id).toBe(key(viaInverse));
    }
  });

  it('patterns are read off the cube, not authored', () => {
    for (const testCase of bigCube) {
      const { face, sides } = testCase.pattern;
      expect(face, testCase.id).toHaveLength(9);
      expect(face[4], `${testCase.id} centre`).toBe(true); // the U centre is always up
      for (const side of ['N', 'E', 'S', 'W']) expect(sides[side]).toHaveLength(3);
    }
  });

  it('PLL cases are fully oriented, so their diagrams are all yellow', () => {
    for (const testCase of pll) {
      expect(testCase.pattern.face.every(Boolean), testCase.id).toBe(true);
    }
  });

  it('OLL cases are never fully oriented', () => {
    for (const testCase of oll) {
      expect(testCase.pattern.face.every(Boolean), testCase.id).toBe(false);
    }
  });

  it('gives every case a full top-down view for its diagram', () => {
    for (const testCase of CASES) {
      const dim = testCase.n; // 4 cells for a 2x2, 9 for a 3x3
      const { face, sides } = testCase.view;
      expect(face, testCase.id).toHaveLength(dim * dim);
      for (const side of ['N', 'E', 'S', 'W']) {
        expect(sides[side], `${testCase.id} ${side}`).toHaveLength(dim);
        expect(sides[side].every((l) => 'UDLRFB'.includes(l))).toBe(true);
      }
    }
  });

  it('every diagram is visually distinct, so the menu is unambiguous', () => {
    const render = (c) =>
      [c.kind, c.view.face, c.view.sides.N, c.view.sides.E, c.view.sides.S, c.view.sides.W]
        .flat()
        .join('');
    for (const set of [bigCube, [...ortegaOll, ...ortegaPbl]]) {
      expect(new Set(set.map(render)).size).toBe(set.length);
    }
  });

  it('PLL diagrams are all top colour on the face; OLL diagrams are not', () => {
    for (const c of pll)
      expect(
        c.view.face.every((l) => l === 'U'),
        c.id,
      ).toBe(true);
    for (const c of oll)
      expect(
        c.view.face.every((l) => l === 'U'),
        c.id,
      ).toBe(false);
  });

  it('looks up by id', () => {
    expect(CASES_BY_ID.get('OLL-27').name).toBe('Sune');
    expect(CASES_BY_ID.get('PLL-T').algs[0]).toBe("R U R' U' R' F R2 U' R' U' R U R' F'");
  });
});

/**
 * The 2x2 set. Same discipline as the 3x3: the seven orientation cases are
 * checked against an independent enumeration of the state space, so a wrong
 * algorithm shows up as a duplicate or a gap.
 *
 * PBL gets no completeness claim — see the note in the describe below.
 */
describe('the Ortega set for 2x2', () => {
  it('every algorithm solves the case it belongs to', () => {
    for (const testCase of [...ortegaOll, ...ortegaPbl]) {
      for (const alg of testCase.algs) {
        const state = stateForAlg(alg, 2);
        expect(isSolved(applyAlg(state, parseAlg(alg, 2))), `${testCase.id}: ${alg}`).toBe(true);
      }
    }
  });

  it('an OLL case has the bottom face done and the top face not', () => {
    for (const testCase of ortegaOll) {
      const state = stateForAlg(testCase.algs[0], 2);
      expect(isFaceUniform(state, 'D'), testCase.id).toBe(true);
      expect(isFaceUniform(state, 'U'), testCase.id).toBe(false);
    }
  });

  it('the 7 OLL cases are exactly the 7 unsolved orientations of a 2x2 last layer', () => {
    const keys = ortegaOll.map((c) => ortegaOllKey(stateForAlg(c.algs[0], 2)));
    expect(new Set(keys).size).toBe(7);

    const everyClass = new Set(enumerateTopOrientations().map(ortegaOllKey));
    everyClass.delete(ortegaOllKey(createSolvedCube(2)));
    expect(everyClass.size).toBe(7);
    expect(new Set(keys)).toEqual(everyClass);
  });

  /**
   * PBL states have both layers oriented but neither permuted. Unlike the OLL
   * sets there is no completeness assertion here: the classic Ortega five are
   * the taught set, and a from-scratch enumeration of both-layers-oriented
   * positions finds more distinct cases than that. What is checked is that each
   * of the five is a genuine PBL algorithm and that no two are the same case.
   */
  it('a PBL case has both layers oriented but is not solved', () => {
    for (const testCase of ortegaPbl) {
      const state = stateForAlg(testCase.algs[0], 2);
      expect(bothLayersOriented(state), testCase.id).toBe(true);
      expect(isSolved(state), testCase.id).toBe(false);
    }
  });

  it('the 5 PBL cases are all different from each other', () => {
    const keys = ortegaPbl.map((c) => pblKey(stateForAlg(c.algs[0], 2)));
    expect(new Set(keys).size).toBe(5);
  });
});

describe('menu filtering', () => {
  const all = sectionsFor(3);
  const count = (options) => flattenSections(filterSections(all, options)).length;

  it('passes everything through by default', () => {
    expect(count({})).toBe(78);
  });

  it('narrows to one set', () => {
    expect(count({ kind: 'OLL' })).toBe(57);
    expect(count({ kind: 'PLL' })).toBe(21);
    expect(count({ kind: 'all' })).toBe(78);
  });

  it('splits on learned / not learned', () => {
    const completed = { 'OLL-27': true, 'PLL-T': true, 'PLL-H': true };
    expect(count({ completedFilter: 'learned', completed })).toBe(3);
    expect(count({ completedFilter: 'unlearned', completed })).toBe(75);
    expect(count({ completedFilter: 'all', completed })).toBe(78);
  });

  it('combines the set and learned filters', () => {
    const completed = { 'OLL-27': true, 'PLL-T': true, 'PLL-H': true };
    expect(count({ kind: 'PLL', completedFilter: 'learned', completed })).toBe(2);
    expect(count({ kind: 'OLL', completedFilter: 'learned', completed })).toBe(1);
    expect(count({ kind: 'OLL', completedFilter: 'unlearned', completed })).toBe(56);
  });

  it('searches names, groups and algorithms', () => {
    expect(count({ search: 'sune' })).toBeGreaterThan(0);
    expect(count({ search: 'dot' })).toBe(8);
    expect(count({ search: 'zzzz' })).toBe(0);
    // Every term has to match, so two terms narrow rather than widen.
    expect(count({ search: 'perm' })).toBe(21);
    expect(count({ search: 'perm g' })).toBe(4);
  });

  it('drops groups and sections that empty out', () => {
    const filtered = filterSections(all, { kind: 'PLL' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].kind).toBe('PLL');
    expect(filtered.every((s) => s.groups.every((g) => g.cases.length > 0))).toBe(true);
  });

  it('works the same way on the 2x2 library', () => {
    const two = sectionsFor(2);
    expect(flattenSections(filterSections(two, {}))).toHaveLength(12);
    expect(flattenSections(filterSections(two, { kind: 'PBL' }))).toHaveLength(5);
    expect(flattenSections(filterSections(two, { kind: 'Ortega OLL' }))).toHaveLength(7);
  });

  it('matchesSearch ignores blank queries', () => {
    const sune = CASES_BY_ID.get('OLL-27');
    expect(matchesSearch(sune, '')).toBe(true);
    expect(matchesSearch(sune, '   ')).toBe(true);
    expect(matchesSearch(sune, 'Sune')).toBe(true);
    expect(matchesSearch(sune, 'antisune')).toBe(false);
  });
});

describe('algorithm variants', () => {
  it('most 3x3 cases offer more than one algorithm', () => {
    const three = CASES.filter((c) => c.n === 3);
    const withChoice = three.filter((c) => c.algs.length > 1);
    expect(withChoice.length).toBeGreaterThan(three.length / 2);
  });

  it('never lists the same algorithm twice for one case', () => {
    for (const testCase of CASES) {
      expect(new Set(testCase.algs).size, testCase.id).toBe(testCase.algs.length);
    }
  });

  it('stores variants in canonical notation', () => {
    for (const testCase of CASES) {
      for (const alg of testCase.algs) {
        expect(formatAlg(parseAlg(alg, testCase.n), testCase.n), `${testCase.id}: ${alg}`).toBe(
          alg,
        );
      }
    }
  });

  it('clamps a stored choice that no longer exists', () => {
    const sune = CASES_BY_ID.get('OLL-27');
    expect(algIndexFor(sune, {})).toBe(0);
    expect(algIndexFor(sune, { 'OLL-27': 1 })).toBe(1);
    expect(algIndexFor(sune, { 'OLL-27': 99 })).toBe(sune.algs.length - 1);
    expect(algIndexFor(sune, { 'OLL-27': -3 })).toBe(0);
  });
});

/**
 * Big-cube parity.
 *
 * Big-cube notation is ambiguous — `r` means the inner slice in some listings
 * and a wide turn in others, and the two readings give completely different
 * results. So rather than trust the spelling, each case is checked to be the
 * parity it claims: which stickers are wrong, and on which kind of piece.
 */
describe('big-cube parity', () => {
  /** Stickers not showing their own colour, tagged by the piece they sit on. */
  const wrongStickers = (cube) => {
    const outer = cube.n - 1;
    const out = [];
    for (const cubie of cube.cubies) {
      for (const local in cubie.stickers) {
        const face = worldFaceOf(cubie, local);
        if (cubie.stickers[local] === face) continue;
        const edges = cubie.pos.filter((v) => Math.abs(v) === outer).length;
        const midge = edges === 2 && cubie.pos.includes(0);
        out.push({
          slot: cubie.pos.join(','),
          kind: edges === 3 ? 'corner' : edges === 2 ? (midge ? 'midge' : 'wing') : 'centre',
        });
      }
    }
    return out;
  };

  it('offers the cases each size can actually reach', () => {
    expect(
      CASES.filter((c) => c.n === 4)
        .map((c) => c.id)
        .sort(),
    ).toEqual(['PAR4-OLL', 'PAR4-PLL']);
    // A 5x5 has no PLL parity — see the test below for why.
    expect(CASES.filter((c) => c.n === 5).map((c) => c.id)).toEqual(['PAR5-OLL']);
  });

  it.each([4, 5])('every %ix%i algorithm solves its case', (n) => {
    for (const testCase of CASES.filter((c) => c.n === n)) {
      for (const alg of testCase.algs) {
        const state = stateForAlg(alg, n);
        expect(isSolved(applyAlg(state, parseAlg(alg, n))), `${testCase.id}: ${alg}`).toBe(true);
      }
    }
  });

  it.each([4, 5])('%ix%i parity leaves corners, midges and centres alone', (n) => {
    for (const testCase of CASES.filter((c) => c.n === n)) {
      const wrong = wrongStickers(stateForAlg(testCase.algs[0], n));
      expect(
        wrong.every((w) => w.kind === 'wing'),
        `${testCase.id}: ${JSON.stringify(wrong)}`,
      ).toBe(true);
    }
  });

  it('4x4 OLL parity is one dedge flipped', () => {
    const wrong = wrongStickers(stateForAlg(CASES_BY_ID.get('PAR4-OLL').algs[0], 4));
    // Both wings of a single dedge, each showing its two colours the wrong way.
    expect(wrong).toHaveLength(4);
    expect(new Set(wrong.map((w) => w.slot)).size).toBe(2);
  });

  it('4x4 PLL parity is two dedges swapped', () => {
    const wrong = wrongStickers(stateForAlg(CASES_BY_ID.get('PAR4-PLL').algs[0], 4));
    // Four wings, one wrong sticker each: their top facelets still match, only
    // the side colours have traded places.
    expect(wrong).toHaveLength(4);
    expect(new Set(wrong.map((w) => w.slot)).size).toBe(4);
  });

  it('5x5 OLL parity flips an edge without touching its middle piece', () => {
    const wrong = wrongStickers(stateForAlg(CASES_BY_ID.get('PAR5-OLL').algs[0], 5));
    expect(wrong).toHaveLength(4);
    expect(new Set(wrong.map((w) => w.slot)).size).toBe(2);
    expect(wrong.every((w) => w.kind === 'wing')).toBe(true);
  });

  /**
   * Why the 5x5 needs no PLL parity algorithm.
   *
   * Its corners and middle edges behave exactly like a 3x3 — a face turn
   * induces a face turn, a middle slice induces a slice — so the reduced puzzle
   * is always in a legal 3x3 state, and a two-edge swap is not one of those.
   */
  it('a 5x5 always reduces to a legal 3x3, so PLL parity cannot arise', () => {
    const n = 5;
    const outer = n - 1;
    const solvedFive = solvedCube(n);
    const isCorner = (p) => p.filter((v) => Math.abs(v) === outer).length === 3;
    const isMidge = (p) => p.filter((v) => Math.abs(v) === outer).length === 2 && p.includes(0);

    const sign = (perm) => {
      let swaps = 0;
      for (let i = 0; i < perm.length; i++) {
        for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) swaps++;
      }
      return swaps % 2 === 0 ? 1 : -1;
    };
    const parityOf = (cube, pick) => {
      const chosen = solvedFive.cubies.filter((c) => pick(c.pos));
      const home = new Map(chosen.map((c, i) => [c.id, i]));
      const byPos = new Map(cube.cubies.map((c) => [c.pos.join(','), c]));
      return sign(chosen.map((c) => home.get(byPos.get(c.pos.join(',')).id)));
    };

    // Deterministic sequences, including a 4x4-style parity algorithm, which
    // would be the obvious way to smuggle an illegal state in.
    //
    // Face and wide turns only. They generate the whole group — a lone inner
    // slice is just Rw followed by R' — while leaving the six true face centres
    // where they are. A slice turn would rotate those, reorienting the frame
    // this comparison is measured against and making it meaningless.
    let seed = 7;
    const rand = (max) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    const tokens = ['U', 'R', 'F', 'D', 'L', 'B', 'Rw', 'Uw', 'Fw', 'Lw', 'Dw', 'Bw'];
    const suffixes = ['', "'", '2'];

    for (let trial = 0; trial < 60; trial++) {
      const text = Array.from(
        { length: 30 },
        () => tokens[rand(tokens.length)] + suffixes[rand(suffixes.length)],
      ).join(' ');
      let cube = applyAlg(solvedFive, parseAlg(text, n));
      if (trial % 3 === 0) cube = applyAlg(cube, parseAlg('2R2 U2 2R2 Uw2 2R2 Uw2 U2', n));
      expect(parityOf(cube, isCorner), text).toBe(parityOf(cube, isMidge));
    }
  });
});
