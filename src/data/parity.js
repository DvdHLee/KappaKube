/**
 * Big-cube reduction parity.
 *
 * Reducing a big cube to a 3x3 can leave it in a state no 3x3 can reach. Which
 * of those are possible depends on whether the cube is even or odd:
 *
 *   4x4  OLL parity (one dedge flipped) and PLL parity (two dedges swapped)
 *   5x5  OLL parity only
 *
 * A 5x5 cannot show PLL parity: its corners and middle edges behave exactly
 * like a 3x3 — a face turn induces a face turn, a middle slice induces a slice
 * — so the reduced puzzle is always in a legal 3x3 state. src/data/cases.test.js
 * checks that empirically as well as checking each algorithm.
 *
 * Notation matters here more than anywhere else. Big-cube listings disagree
 * about whether `r` means the inner slice or a wide turn, and the two readings
 * give completely different results — so these are written explicitly with `2R`
 * for the inner slice and `Rw`/`Uw` for wide turns.
 */

export const PARITY_GROUP = 'Reduction parity';

/** The flip-one-edge algorithm; the same inner-slice moves work on both sizes. */
const FLIP_EDGE = "2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2";

export const PARITY_CASES = {
  4: [
    { id: 'OLL', name: 'OLL parity', note: 'One dedge flipped', algs: [FLIP_EDGE] },
    {
      id: 'PLL',
      name: 'PLL parity',
      note: 'Two dedges swapped',
      // The familiar short form leaves the top layer turned by a half turn — in
      // practice you AUF afterwards — so the closing U2 is part of the algorithm
      // here, which lets it finish on a solved cube.
      algs: ['2R2 U2 2R2 Uw2 2R2 Uw2 U2'],
    },
  ],
  5: [
    {
      id: 'OLL',
      name: 'OLL parity',
      note: 'One edge flipped, midge in place',
      algs: [FLIP_EDGE],
    },
  ],
};

export const PARITY_SIZES = Object.keys(PARITY_CASES).map(Number);
