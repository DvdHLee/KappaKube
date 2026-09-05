import { describe, expect, it } from 'vitest';
import { createSolvedCube, cubesEqual } from './cube.js';
import { applyAlg, normalizeAmount } from './moves.js';
import { NotationError, formatAlg, formatMove, parseAlg } from './notation.js';

const state = (alg, n = 3) => applyAlg(createSolvedCube(n), parseAlg(alg, n));
const same = (a, b, n = 3) => cubesEqual(state(a, n), state(b, n));

const BASIC_18 = [
  'U', "U'", 'U2', 'D', "D'", 'D2', 'L', "L'", 'L2',
  'R', "R'", 'R2', 'F', "F'", 'F2', 'B', "B'", 'B2',
]; // prettier-ignore

describe('parsing basics', () => {
  it('parses a plain sequence', () => {
    expect(parseAlg("R U R' U'")).toHaveLength(4);
  });

  it('tolerates commas, extra whitespace and newlines', () => {
    expect(parseAlg("  R,  U\n R' \t U'  ")).toHaveLength(4);
    expect(same("R,U,R',U'", "R U R' U'")).toBe(true);
  });

  it('accepts a unicode prime', () => {
    expect(same('R’', "R'")).toBe(true);
  });

  it('drops moves that come out as no-ops', () => {
    expect(parseAlg('R4')).toHaveLength(0);
    expect(parseAlg('R4 U')).toHaveLength(1);
  });

  it('reads arbitrary turn counts modulo 4', () => {
    expect(same('R3', "R'")).toBe(true);
    expect(same('R5', 'R')).toBe(true);
    expect(same("R2'", 'R2')).toBe(true);
  });
});

describe('move kinds', () => {
  it('treats lowercase as wide', () => {
    for (const [lower, wide] of [
      ['r', 'Rw'],
      ['u', 'Uw'],
      ['f', 'Fw'],
      ['d', 'Dw'],
      ['l', 'Lw'],
      ['b', 'Bw'],
    ]) {
      expect(same(lower, wide), `${lower} != ${wide}`).toBe(true);
    }
  });

  it('reads a wide depth prefix', () => {
    // On a 3x3 all three layers is just a whole-cube rotation.
    expect(same('3Rw', 'x')).toBe(true);
    expect(same('3Uw', 'y', 3)).toBe(true);
  });

  it('reads SiGN single inner layers', () => {
    expect(same('2R', "M'")).toBe(true);
    expect(same('2L', 'M')).toBe(true);
  });

  it('accepts uppercase rotation letters', () => {
    expect(same('X', 'x')).toBe(true);
    expect(same('Y2', 'y2')).toBe(true);
  });

  it('resolves layers against the cube size', () => {
    const r3 = parseAlg('Rw', 3)[0];
    const r5 = parseAlg('Rw', 5)[0];
    expect(r3.layers).toEqual([2, 0]);
    expect(r5.layers).toEqual([4, 2]);
    expect(parseAlg('3Rw', 5)[0].layers).toEqual([4, 2, 0]);
  });
});

describe('grouping', () => {
  it('repeats a parenthesised group', () => {
    expect(parseAlg("(R U R' U')3")).toHaveLength(12);
    expect(same('(R U)2', 'R U R U')).toBe(true);
  });

  it('inverts a primed group', () => {
    expect(same("(R U)'", "U' R'")).toBe(true);
    expect(same("(R U R' U')2'", "(U R U' R')2")).toBe(true);
  });

  it('nests groups', () => {
    expect(same('((R U)2 D)2', 'R U R U D R U R U D')).toBe(true);
  });

  it("expands a commutator [A, B] to A B A' B'", () => {
    expect(same('[R, U]', "R U R' U'")).toBe(true);
    expect(same("[R U R', D2]", "R U R' D2 R U' R' D2")).toBe(true);
  });

  it("expands a conjugate [A: B] to A B A'", () => {
    expect(same('[R: U]', "R U R'")).toBe(true);
  });

  it('repeats a bracket group', () => {
    expect(same('[R, U]3', "(R U R' U')3")).toBe(true);
  });
});

describe('errors', () => {
  it('rejects unknown letters with a character offset', () => {
    try {
      parseAlg('R U Q');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NotationError);
      expect(error.index).toBe(4);
      expect(error.message).toMatch(/Unknown move "Q"/);
    }
  });

  it.each([
    ['(R U', /Unclosed "\("/],
    ['R U)', /Unexpected "\)"/],
    ['[R, U', /Unclosed "\["/],
    ['[R U]', /Expected "," or ":"/],
    ['R0', /cannot be 0/],
    ['2x', /rotation cannot take a layer count/],
    ['2M', /slice cannot take a layer count/],
    ['9R', /outside a 3x3/],
    ['3', /Expected a move after the layer count/],
  ])('rejects %s', (text, message) => {
    expect(() => parseAlg(text)).toThrow(message);
  });

  it('reports an index on every error', () => {
    for (const bad of ['(R U', 'R U)', '[R, U', 'R0', '9R']) {
      try {
        parseAlg(bad);
      } catch (error) {
        expect(typeof error.index).toBe('number');
      }
    }
  });
});

describe('formatting', () => {
  it('round-trips all 18 basic moves', () => {
    for (const text of BASIC_18) {
      const [move] = parseAlg(text);
      expect(formatMove(move), `round trip failed for ${text}`).toBe(text);
    }
  });

  it('round-trips wide moves, slices and rotations', () => {
    for (const text of ['Rw', "Rw'", 'Rw2', 'M', "M'", 'M2', 'E', 'S', 'x', "y'", 'z2']) {
      const [move] = parseAlg(text);
      expect(formatMove(move), `round trip failed for ${text}`).toBe(text);
    }
  });

  it('round-trips a whole algorithm', () => {
    const alg = "R U R' U' R' F R2 U' R' U' R U R' F'";
    expect(formatAlg(parseAlg(alg))).toBe(alg);
  });

  it('canonicalises equivalent spellings', () => {
    expect(formatAlg(parseAlg('r'))).toBe('Rw');
    expect(formatAlg(parseAlg('R3'))).toBe("R'");
    expect(formatAlg(parseAlg("R2'"))).toBe('R2');
    expect(formatAlg(parseAlg('3Rw'))).toBe('x'); // all three layers of a 3x3
  });

  it('expands grouping into flat notation', () => {
    expect(formatAlg(parseAlg('[R, U]'))).toBe("R U R' U'");
    expect(formatAlg(parseAlg('(R U)2'))).toBe('R U R U');
  });

  it('formats larger cubes', () => {
    expect(formatAlg(parseAlg('3Rw', 5), 5)).toBe('3Rw');
    expect(formatAlg(parseAlg('Rw', 4), 4)).toBe('Rw');
    expect(formatAlg(parseAlg('2R', 5), 5)).toBe('2R');
  });

  it('returns an empty string for a no-op move', () => {
    expect(formatMove({ axis: 'x', layers: [2], amount: 0 })).toBe('');
  });

  it('throws when a layer set has no conventional spelling', () => {
    // Outer R layer plus a non-adjacent inner layer: not any standard move.
    expect(() => formatMove({ axis: 'x', layers: [4, 0], amount: 1 }, 5)).toThrow(
      /No conventional notation/,
    );
  });

  it('parse(format(m)) is stable for every parsed move', () => {
    const texts = ['U', "R'", 'F2', 'Rw', "Uw'", 'M2', 'E', "S'", 'x', 'y2', "z'"];
    for (const text of texts) {
      const [move] = parseAlg(text);
      const [reparsed] = parseAlg(formatMove(move));
      expect(reparsed.axis).toBe(move.axis);
      expect(normalizeAmount(reparsed.amount)).toBe(normalizeAmount(move.amount));
      expect([...reparsed.layers].sort()).toEqual([...move.layers].sort());
    }
  });
});
