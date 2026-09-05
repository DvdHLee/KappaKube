import { describe, expect, it } from 'vitest';
import {
  createSolvedCube,
  cubesEqual,
  isSolved,
  sameVisibleState,
  worldFaceOf,
} from './cube.js';
import { applyAlg, invertAlg, normalizeAmount, repeatAlg, rotationMatrix } from './moves.js';
import { parseAlg } from './notation.js';

const solved = (n = 3) => createSolvedCube(n);

/** Cube state after running an algorithm string from solved. */
function state(alg, n = 3) {
  return applyAlg(solved(n), parseAlg(alg, n));
}

/**
 * Does this algorithm leave the cube looking untouched?
 *
 * Uses the visible comparison, not the strict one: real algorithms twist
 * centres, and a centre's twist is unobservable on a normal cube. See the
 * "centre twist" block below, which pins that behaviour down.
 */
function isIdentity(alg, n = 3) {
  return sameVisibleState(state(alg, n), solved(n));
}

const BASIC = ['U', 'D', 'L', 'R', 'F', 'B'];

describe('normalizeAmount', () => {
  it('collapses to a canonical -1 / 1 / 2, with 0 for a no-op', () => {
    expect([0, 1, 2, 3, 4, 5, -1, -2, -3].map(normalizeAmount)).toEqual([
      0, 1, 2, -1, 0, 1, -1, 2, 1,
    ]);
  });
});

describe('rotationMatrix', () => {
  it('is exact integer arithmetic', () => {
    for (const axis of ['x', 'y', 'z']) {
      for (const q of [0, 1, 2, 3]) {
        for (const v of rotationMatrix(axis, q)) expect(Number.isInteger(v)).toBe(true);
      }
    }
  });

  it('returns to the identity after four quarter turns', () => {
    for (const axis of ['x', 'y', 'z']) {
      expect(rotationMatrix(axis, 4)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }
  });
});

/**
 * The load-bearing test.
 *
 * Order tests (sexy, T-perm, Sune) all pass under a mirrored sign convention
 * too, because the mirror of an order-k algorithm still has order k. Only
 * checking where a specific sticker physically lands catches a flipped sign.
 *
 * Turning U clockwise, viewed from above, carries the front face's top row to
 * the left: so the URF corner lands at ULF, and its front sticker ends up
 * facing left.
 */
describe('turn direction', () => {
  it('U carries the URF corner to ULF with its F sticker facing L', () => {
    const after = state('U');
    const urf = solved().cubies.find(
      (c) => c.pos[0] === 2 && c.pos[1] === 2 && c.pos[2] === 2,
    ).id;
    const moved = after.cubies.find((c) => c.id === urf);

    expect(moved.pos).toEqual([-2, 2, 2]); // U, F, L
    expect(worldFaceOf(moved, 'F')).toBe('L');
    expect(worldFaceOf(moved, 'U')).toBe('U'); // U turns do not tilt the U sticker
  });

  it('R carries the FR edge to UR with its F sticker facing U', () => {
    const after = state('R');
    const fr = solved().cubies.find(
      (c) => c.pos[0] === 2 && c.pos[1] === 0 && c.pos[2] === 2,
    ).id;
    const moved = after.cubies.find((c) => c.id === fr);

    expect(moved.pos).toEqual([2, 2, 0]);
    expect(worldFaceOf(moved, 'F')).toBe('U');
  });
});

describe('move orders', () => {
  it.each(BASIC)('%s has order 4', (face) => {
    expect(isIdentity(face)).toBe(false);
    expect(isIdentity(`${face}2`)).toBe(false);
    expect(isIdentity(`${face}${face}${face}`)).toBe(false);
    expect(isIdentity(`${face}4`)).toBe(true);
  });

  it.each(BASIC)('%s2 is its own inverse', (face) => {
    expect(isIdentity(`${face}2 ${face}2`)).toBe(true);
  });

  it.each(BASIC)("%s' undoes %s", (face) => {
    expect(isIdentity(`${face} ${face}'`)).toBe(true);
  });
});

describe('known algorithm orders', () => {
  it('sexy move (R U R\' U\') has order 6', () => {
    expect(isIdentity("(R U R' U')5")).toBe(false);
    expect(isIdentity("(R U R' U')6")).toBe(true);
  });

  it('T-perm is an involution', () => {
    const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
    expect(isIdentity(tPerm)).toBe(false);
    expect(isIdentity(`${tPerm} ${tPerm}`)).toBe(true);
  });

  it('Sune has order 6', () => {
    const sune = "R U R' U R U2 R'";
    expect(isIdentity(repeatString(sune, 5))).toBe(false);
    expect(isIdentity(repeatString(sune, 6))).toBe(true);
  });

  it('Y-perm is an involution', () => {
    const yPerm = "F R U' R' U' R U R' F' R U R' U' R' F R F'";
    expect(isIdentity(yPerm)).toBe(false);
    expect(isIdentity(`${yPerm} ${yPerm}`)).toBe(true);
  });

  it('a superflip-ish 6-mover is not the identity', () => {
    expect(isIdentity("R U R' U'")).toBe(false);
  });
});

function repeatString(alg, times) {
  return Array.from({ length: times }, () => alg).join(' ');
}

/**
 * Centres have one sticker, so their rotation about their own normal is
 * invisible on a normal cube but is tracked by the model — which makes it a
 * supercube model for free, and is why algorithm identity is judged visibly.
 */
describe('centre twist', () => {
  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";

  it('a T-perm nets one quarter turn of the U layer, twisting the U centre', () => {
    const after = state(tPerm);
    const centre = after.cubies.find((c) => c.pos.join() === '0,2,0');
    expect(Object.keys(centre.stickers)).toEqual(['U']); // one sticker
    expect(worldFaceOf(centre, 'U')).toBe('U'); // still showing on U
    expect(centre.rot).not.toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]); // but rotated
  });

  it('two T-perms look solved while the U centre is a half turn out', () => {
    const twice = state(`${tPerm} ${tPerm}`);
    expect(sameVisibleState(twice, solved())).toBe(true);
    expect(isSolved(twice)).toBe(true);
    expect(cubesEqual(twice, solved())).toBe(false); // supercube says otherwise
  });

  it('four T-perms restore even the centre', () => {
    expect(cubesEqual(state(`${tPerm} ${tPerm} ${tPerm} ${tPerm}`), solved())).toBe(true);
  });
});

describe('rotations and slices', () => {
  it('whole-cube rotations leave the cube solved but reoriented', () => {
    for (const rotation of ['x', 'y', 'z', "x'", 'y2']) {
      const after = state(rotation);
      expect(isSolved(after)).toBe(true); // every face still one colour
      expect(sameVisibleState(after, solved())).toBe(false); // but colours moved faces
    }
  });

  it('x = R M\' L\'', () => {
    expect(cubesEqual(state('x'), state("R M' L'"))).toBe(true);
  });

  it('y = U E\' D\'', () => {
    expect(cubesEqual(state('y'), state("U E' D'"))).toBe(true);
  });

  it('z = F S B\'', () => {
    expect(cubesEqual(state('z'), state("F S B'"))).toBe(true);
  });

  it("M = L' x' R", () => {
    // From x = R M' L', prepending R' and appending L cancels adjacently to M'.
    expect(cubesEqual(state('M'), state("L' x' R"))).toBe(true);
  });

  it('a wide turn is the face plus the slice: Rw = R M\'', () => {
    expect(cubesEqual(state('Rw'), state("R M'"))).toBe(true);
    expect(cubesEqual(state('r'), state("R M'"))).toBe(true);
  });

  it('x = Rw L\'', () => {
    expect(cubesEqual(state('x'), state("Rw L'"))).toBe(true);
  });
});

describe('inversion', () => {
  it('an algorithm followed by its inverse is the identity', () => {
    const alg = parseAlg("R U R' U' R' F R2 U' R' U' R U R' F'");
    expect(cubesEqual(applyAlg(solved(), [...alg, ...invertAlg(alg)]), solved())).toBe(true);
  });

  it('holds for random sequences on several cube sizes', () => {
    // Deterministic LCG so a failure is reproducible.
    let seed = 12345;
    const rand = (max) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    const tokens = ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'E', 'S', 'Rw', 'Uw', 'x', 'y', 'z'];
    const suffixes = ['', "'", '2'];

    for (const n of [3, 4, 5]) {
      for (let trial = 0; trial < 20; trial++) {
        const text = Array.from(
          { length: 15 },
          () => tokens[rand(tokens.length)] + suffixes[rand(suffixes.length)],
        ).join(' ');
        const alg = parseAlg(text, n);
        const round = applyAlg(solved(n), [...alg, ...invertAlg(alg)]);
        expect(cubesEqual(round, solved(n)), `failed for n=${n}: ${text}`).toBe(true);
      }
    }
  });

  it('repeatAlg concatenates', () => {
    expect(repeatAlg(parseAlg('R U'), 3)).toHaveLength(6);
  });
});

describe('applyMove immutability', () => {
  it('does not mutate the input cube', () => {
    const before = solved();
    const snapshot = JSON.stringify(before);
    applyAlg(before, parseAlg("R U R' U'"));
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('shares untouched cubies by reference', () => {
    const before = solved();
    const after = applyAlg(before, parseAlg('U'));
    const untouched = before.cubies.filter((c) => c.pos[1] !== 2);
    for (const cubie of untouched) {
      expect(after.cubies.find((c) => c.id === cubie.id)).toBe(cubie);
    }
  });
});

describe('other cube sizes', () => {
  it('face turns have order 4 on 2x2 through 5x5', () => {
    for (const n of [2, 3, 4, 5]) {
      for (const face of BASIC) expect(isIdentity(`${face}4`, n)).toBe(true);
    }
  });

  it('2x2 has no slice layers', () => {
    expect(() => parseAlg('M', 2)).toThrow(/larger than 2x2/);
  });

  it('4x4 inner-layer turns work and are size-aware', () => {
    expect(isIdentity('2R4', 4)).toBe(true);
    expect(isIdentity('2R', 4)).toBe(false);
  });
});
