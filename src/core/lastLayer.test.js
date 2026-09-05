import { describe, expect, it } from 'vitest';
import { createSolvedCube } from './cube.js';
import { applyAlg } from './moves.js';
import { parseAlg } from './notation.js';
import {
  buildOrientationState,
  centreColours,
  enumerateOrientationStates,
  enumeratePermutationStates,
  isF2LSolved,
  isLLOriented,
  ollKey,
  orientationPattern,
  pllKey,
  topView,
} from './lastLayer.js';

const solved = () => createSolvedCube(3);
const after = (alg) => applyAlg(solved(), parseAlg(alg, 3));

describe('F2L and orientation predicates', () => {
  it('a solved cube passes both', () => {
    expect(isF2LSolved(solved())).toBe(true);
    expect(isLLOriented(solved())).toBe(true);
  });

  it('last-layer algorithms leave F2L alone', () => {
    // Both of these net out to zero R and zero F turns, so the pairs below the
    // top layer come back to where they started.
    for (const alg of ["R U R' U R U2 R'", "F R U R' U' F'", "R U2 R' U' R U' R'"]) {
      expect(isF2LSolved(after(alg)), alg).toBe(true);
    }
  });

  it('detects an algorithm that cuts into F2L', () => {
    expect(isF2LSolved(after('D'))).toBe(false);
    expect(isF2LSolved(after("R U R' D"))).toBe(false);
    // The sexy move is an F2L insertion trigger, not a last-layer algorithm:
    // displacing the front-right pair is the entire point of it.
    expect(isF2LSolved(after("R U R' U'"))).toBe(false);
  });

  it('a U turn cannot disturb orientation', () => {
    expect(isLLOriented(after('U'))).toBe(true);
    expect(isLLOriented(after("R U R' U'"))).toBe(false);
  });

  it('refuses cube sizes it does not model', () => {
    expect(() => isF2LSolved(createSolvedCube(4))).toThrow(/3x3 only/);
  });
});

describe('topView', () => {
  it('is entirely U-facing on a solved cube, with no side sticker showing U', () => {
    const view = topView(solved());
    expect(view.face).toEqual(new Array(9).fill('U'));
    expect(view.sides.N).toEqual(['B', 'B', 'B']);
    expect(view.sides.S).toEqual(['F', 'F', 'F']);
    expect(view.sides.E).toEqual(['R', 'R', 'R']);
    expect(view.sides.W).toEqual(['L', 'L', 'L']);
  });

  it('reports face letters against the current centres, not fixed colours', () => {
    // y turns the cube; the sides are relabelled but the picture is still solved.
    const view = topView(after('y'));
    expect(view.face).toEqual(new Array(9).fill('U'));
    expect(view.sides.S).toEqual(['F', 'F', 'F']);
  });

  it('names every sticker of the last layer exactly once', () => {
    const view = topView(after("R U R' U R U2 R'"));
    const all = [...view.face, ...view.sides.N, ...view.sides.E, ...view.sides.S, ...view.sides.W];
    expect(all).toHaveLength(21); // 9 on top, 12 around the ring
    expect(all.every((letter) => 'UDLRFB'.includes(letter))).toBe(true);
  });

  it('agrees with orientationPattern', () => {
    for (const alg of ["R U R' U R U2 R'", "F R U R' U' F'", "R U2 R2 U' R2 U' R2 U2 R"]) {
      const view = topView(after(alg));
      const pattern = orientationPattern(after(alg));
      expect(pattern.face, alg).toEqual(view.face.map((l) => l === 'U'));
      expect(pattern.sides.S, alg).toEqual(view.sides.S.map((l) => l === 'U'));
    }
  });
});

describe('orientationPattern', () => {
  it('is all-true on a solved cube and has no side tabs lit', () => {
    const { face, sides } = orientationPattern(solved());
    expect(face).toEqual(new Array(9).fill(true));
    for (const side of ['N', 'E', 'S', 'W']) {
      expect(sides[side], side).toEqual([false, false, false]);
    }
  });

  it('reads the U colour off the cube rather than assuming one', () => {
    // After z2 the U face shows what used to be D. The pattern must still be
    // "solved", because it compares against the current U centre.
    expect(centreColours(after('z2')).U).not.toBe('U');
    expect(orientationPattern(after('z2')).face).toEqual(new Array(9).fill(true));
  });

  it('lights exactly the stickers a Sune leaves misoriented', () => {
    const { face, sides } = orientationPattern(after("R U R' U R U2 R'"));
    const lit = face.filter(Boolean).length;
    const tabs = [...sides.N, ...sides.E, ...sides.S, ...sides.W].filter(Boolean).length;
    // Sune orients three corners; its inverse case shows 5 of 9 on top and
    // one side tab per misoriented corner.
    expect(lit + tabs).toBe(9); // 4 edges + centre on top, plus 4 corner stickers somewhere
    expect(face[4]).toBe(true); // the centre is always the U colour
  });
});

/**
 * These two are the load-bearing tests of the whole OLL/PLL effort.
 *
 * The state spaces are enumerated from first principles — every twist and flip
 * a real cube allows, every permutation the parity rule allows — and the case
 * counts that fall out are the ones the cubing world has always quoted. That
 * agreement is what licenses using these keys to judge whether a set of
 * algorithms is complete and duplicate-free.
 */
describe('the last-layer state space', () => {
  it('has 216 orientations forming exactly 58 OLL classes', () => {
    const states = enumerateOrientationStates();
    expect(states).toHaveLength(216);
    expect(states.every(isF2LSolved)).toBe(true);

    const classes = new Map();
    for (const state of states) classes.set(ollKey(state), (classes.get(ollKey(state)) ?? 0) + 1);

    // 57 algorithms plus the already-oriented case.
    expect(classes.size).toBe(58);

    // Orbit sizes under the four AUFs, exactly as Burnside's lemma predicts:
    // two fully symmetric states, five with a half-turn symmetry, the rest free.
    const bySize = {};
    for (const count of classes.values()) bySize[count] = (bySize[count] ?? 0) + 1;
    expect(bySize).toEqual({ 1: 2, 2: 5, 4: 51 });

    expect(states.filter(isLLOriented)).toHaveLength(1);
  });

  it('has 288 permutations forming exactly 22 PLL classes', () => {
    const states = enumeratePermutationStates();
    expect(states).toHaveLength(288);
    expect(states.every(isF2LSolved)).toBe(true);
    expect(states.every(isLLOriented)).toBe(true); // PLL means orientation is done

    const classes = new Set(states.map(pllKey));
    expect(classes.size).toBe(22); // 21 algorithms plus solved
  });
});

describe('case keys', () => {
  it('an OLL key ignores how the U layer happens to be turned', () => {
    const base = after("R U R' U R U2 R'");
    for (const auf of ['U', 'U2', "U'"]) {
      expect(ollKey(applyAlg(base, parseAlg(auf, 3))), auf).toBe(ollKey(base));
    }
  });

  it('a PLL key ignores AUF and which side you stand on', () => {
    const base = after("R U R' U' R' F R2 U' R' U' R U R' F'"); // T-perm
    for (const alg of ['U', "U'", 'y', 'y2', "U y'", 'U2 y2']) {
      expect(pllKey(applyAlg(base, parseAlg(alg, 3))), alg).toBe(pllKey(base));
    }
  });

  it('different cases get different keys', () => {
    expect(ollKey(after("R U R' U R U2 R'"))).not.toBe(ollKey(after("R U2 R' U' R U' R'")));
  });

  it('twisting a corner is direction-consistent around all four corners', () => {
    // Twisting every corner the same way must give the same case whichever
    // corner you start from; if the handedness of the twist flipped between
    // corners, these would come out as different cases and the 58-class count
    // above would be wrong.
    const a = buildOrientationState([1, 2, 0, 0], [0, 0, 0, 0]);
    const b = buildOrientationState([0, 1, 2, 0], [0, 0, 0, 0]);
    const c = buildOrientationState([0, 0, 1, 2], [0, 0, 0, 0]);
    expect(ollKey(b)).toBe(ollKey(a));
    expect(ollKey(c)).toBe(ollKey(a));
  });
});
