import { describe, expect, it } from 'vitest';
import { createSolvedCube, sameVisibleState, worldFaceOf } from './cube.js';
import { applyAlg } from './moves.js';
import { parseAlg } from './notation.js';
import {
  canPaint,
  clearFacelet,
  createPainting,
  editableFacelets,
  faceletKey,
  isReachable,
  paintFacelet,
  slotsOf,
  paintStatus,
  paintingToCube,
} from './paint.js';

/** Every facelet of a cube, as the painting would record it. */
const faceletsOf = (cube) => {
  const map = {};
  for (const cubie of cube.cubies) {
    for (const local in cubie.stickers) {
      map[faceletKey(cubie.pos, worldFaceOf(cubie, local))] = cubie.stickers[local];
    }
  }
  return map;
};

/**
 * Paint a cube in by copying its own stickers, skipping any the engine has
 * already worked out.
 */
function paintWhole(cube) {
  const truth = faceletsOf(cube);
  let painting = createPainting(cube.n);
  let clicks = 0;

  for (const facelet of editableFacelets(painting)) {
    if (painting.colours[facelet.key]) continue; // already deduced
    const result = paintFacelet(painting, facelet.key, truth[facelet.key]);
    if (!result.ok) return { refused: result.reason, clicks };
    painting = result.painting;
    clicks++;
  }
  return { painting, clicks };
}

/**
 * A 2x2 has no centres, so its back-bottom-left corner stands in as the fixed
 * reference. Scrambling with R/U/F alone never moves that corner, which is the
 * orientation a user would hold their cube in.
 */
const SCRAMBLE_2 = "R U F R2 U' F2 R U2 F' R";
const SCRAMBLE_3 = "R U R' F2 D L2 U' B R2 D'";

describe('setting up a painting', () => {
  it('only offers the sizes worth painting', () => {
    expect(canPaint(2)).toBe(true);
    expect(canPaint(3)).toBe(true);
    expect(canPaint(4)).toBe(false);
    expect(() => createPainting(4)).toThrow(/Cannot paint/);
  });

  it('fills in the centres of a 3x3, since they name the colours', () => {
    const painting = createPainting(3);
    expect(painting.fixed).toHaveLength(6);
    // 54 stickers less the six centres.
    expect(editableFacelets(painting)).toHaveLength(48);
  });

  it('fills in a corner on a 2x2, which has no centres to fix', () => {
    const painting = createPainting(2);
    expect(painting.fixed).toHaveLength(3);
    expect(editableFacelets(painting)).toHaveLength(21);
  });
});

describe('painting a whole cube', () => {
  it.each([
    [2, SCRAMBLE_2],
    [3, SCRAMBLE_3],
  ])('reproduces a scrambled %ix%i', (n, scramble) => {
    const cube = applyAlg(createSolvedCube(n), parseAlg(scramble, n));
    const { painting, refused } = paintWhole(cube);
    expect(refused).toBeUndefined();

    const rebuilt = paintingToCube(painting);
    expect(rebuilt).not.toBeNull();
    // Visible state, not exact: the twist of a centre cannot be seen, so it
    // cannot be painted either, and rebuilding it is neither possible nor
    // meaningful.
    expect(sameVisibleState(rebuilt, cube)).toBe(true);
  });

  it('reports progress and completion', () => {
    const cube = applyAlg(createSolvedCube(3), parseAlg(SCRAMBLE_3));
    const { painting } = paintWhole(cube);
    const status = paintStatus(painting);
    expect(status.painted).toBe(status.total);
    expect(status.complete).toBe(true);
    expect(status.reachable).toBe(true);
  });
});

/**
 * The point of working in whole pieces: both kinds of deduction a user would
 * expect fall out of "only one candidate is left", with no rule written for
 * either one.
 */
describe('inference', () => {
  it('needs fewer clicks than there are stickers', () => {
    const cube = applyAlg(createSolvedCube(3), parseAlg(SCRAMBLE_3));
    const { clicks } = paintWhole(cube);
    expect(clicks).toBeLessThan(48);
  });

  it('fills the third sticker of a corner from the other two', () => {
    const cube = applyAlg(createSolvedCube(3), parseAlg(SCRAMBLE_3));
    const truth = faceletsOf(cube);
    let painting = createPainting(3);

    const pos = [2, 2, 2];
    const keys = ['U', 'R', 'F'].map((face) => faceletKey(pos, face));

    painting = paintFacelet(painting, keys[0], truth[keys[0]]).painting;
    expect(painting.colours[keys[2]]).toBeUndefined();

    painting = paintFacelet(painting, keys[1], truth[keys[1]]).painting;
    // Two stickers in known positions leave exactly one corner that fits.
    expect(painting.colours[keys[2]]).toBe(truth[keys[2]]);
  });

  it('settles the remaining pieces by elimination', () => {
    const cube = applyAlg(createSolvedCube(3), parseAlg(SCRAMBLE_3));
    const truth = faceletsOf(cube);
    let painting = createPainting(3);
    const facelets = editableFacelets(painting);

    let painted = 0;
    for (const facelet of facelets) {
      if (painting.colours[facelet.key]) continue;
      const remaining = facelets.filter((f) => !painting.colours[f.key]).length;
      if (remaining <= 2) break;
      painting = paintFacelet(painting, facelet.key, truth[facelet.key]).painting;
      painted++;
    }

    expect(painted).toBeGreaterThan(0);
    // Nothing is left to choose: the rest was forced along the way.
    expect(paintStatus(painting).complete).toBe(true);
  });
});

describe('refusing what a cube cannot be', () => {
  it('turns down a sticker no real piece could carry', () => {
    let painting = createPainting(3);
    const urf = [2, 2, 2];
    painting = paintFacelet(painting, faceletKey(urf, 'U'), 'U').painting;

    // U and D are opposite faces; no piece carries both.
    const result = paintFacelet(painting, faceletKey(urf, 'R'), 'D');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/No real piece/);
    expect(result.painting).toBe(painting); // left untouched
  });

  /**
   * The counting rule. Nothing about a fifth yellow corner is locally wrong —
   * every one of those slots still has candidates. What is wrong is that four
   * corner pieces carry yellow and five slots are asking for them.
   */
  it.each([
    ['corner', 3],
    ['edge', 3],
    ['corner', 2],
  ])('allows only four %ss of a colour on a %ix%i', (kind, n) => {
    let painting = createPainting(n);
    let accepted = 0;
    let reason;

    for (const slot of slotsOf(n).filter((s) => s.kind === kind)) {
      const key = faceletKey(slot.pos, slot.faces[0]);
      if (painting.colours[key] !== undefined) continue; // fixed reference
      const result = paintFacelet(painting, key, 'U');
      if (!result.ok) {
        reason = result.reason;
        break;
      }
      painting = result.painting;
      accepted++;
    }

    expect(accepted).toBe(4);
    expect(reason).toMatch(/Not enough pieces/);
  });

  it('will not let the fixed reference be repainted', () => {
    const painting = createPainting(3);
    const result = paintFacelet(painting, painting.fixed[0], 'R');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/fixed reference/);
  });

  it('refuses a cube that would need one edge flipped', () => {
    const flipped = { n: 3, cubies: createSolvedCube(3).cubies.map((c) => ({ ...c })) };
    const uf = flipped.cubies.find((c) => c.pos.join() === '0,2,2');
    uf.rot = [-1, 0, 0, 0, 0, 1, 0, 1, 0];

    expect(isReachable(flipped).ok).toBe(false);
    expect(isReachable(flipped).reason).toMatch(/flipped/);
    // And the painter never lets you get there in the first place.
    expect(paintWhole(flipped).refused).toBeTruthy();
  });

  it('refuses a cube that would need two pieces swapped', () => {
    const swapped = { n: 3, cubies: createSolvedCube(3).cubies.map((c) => ({ ...c })) };
    const a = swapped.cubies.find((c) => c.pos.join() === '0,2,2');
    const b = swapped.cubies.find((c) => c.pos.join() === '2,2,0');
    [a.pos, b.pos] = [b.pos, a.pos];
    a.rot = [0, 0, 1, 0, 1, 0, -1, 0, 0];
    b.rot = [0, 0, -1, 0, 1, 0, 1, 0, 0];

    expect(isReachable(swapped).ok).toBe(false);
    expect(isReachable(swapped).reason).toMatch(/swapped/);
  });

  it('accepts anything actually reached by turning', () => {
    for (const alg of [SCRAMBLE_3, "R U R' U'", 'F2 B2 L2 R2 U2 D2', "R U2 D' B D'"]) {
      expect(isReachable(applyAlg(createSolvedCube(3), parseAlg(alg))).ok, alg).toBe(true);
    }
  });
});

describe('clearing', () => {
  it('removes a painted sticker but keeps the reference', () => {
    let painting = createPainting(3);
    const key = faceletKey([2, 2, 2], 'U');
    painting = paintFacelet(painting, key, 'U').painting;
    expect(painting.colours[key]).toBe('U');

    painting = clearFacelet(painting, key);
    expect(painting.colours[key]).toBeUndefined();

    const fixed = painting.fixed[0];
    expect(clearFacelet(painting, fixed).colours[fixed]).toBeDefined();
  });
});
