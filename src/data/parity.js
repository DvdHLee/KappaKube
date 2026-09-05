/**
 * 4x4 parity cases.
 *
 * Reducing a 4x4 to a 3x3 can leave it in a state no 3x3 can reach: a single
 * dedge flipped, or two dedges swapped. Those are the only two extra cases a
 * 4x4 needs beyond the 3x3 sets, which is why this file is short.
 *
 * Notation matters here more than anywhere else. Big-cube listings disagree
 * about whether `r` means the inner slice or a wide turn, and the two readings
 * give completely different results — so these are written explicitly with
 * `2R` for the inner slice and `Rw`/`Uw` for wide turns. src/data/cases.test.js
 * checks the resulting state really is the parity it claims to be.
 */

export const PARITY_GROUP = 'Reduction parity';

export const PARITY_CASES = [
  {
    id: 'OLL',
    name: 'OLL parity',
    note: 'One dedge flipped',
    algs: ["2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2"],
  },
  {
    id: 'PLL',
    name: 'PLL parity',
    note: 'Two dedges swapped',
    // The familiar short form leaves the top layer turned by a half turn — in
    // practice you AUF afterwards — so the closing U2 is part of the algorithm
    // here, which lets it finish on a solved cube.
    algs: ['2R2 U2 2R2 Uw2 2R2 Uw2 U2'],
  },
];
