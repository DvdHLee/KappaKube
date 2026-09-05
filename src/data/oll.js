/**
 * The 57 OLL cases, grouped by the shape the yellow stickers make — which is
 * how they are actually recognised at the cube.
 *
 * Only the case number, name, group and algorithms are authored here. The
 * recognition pattern and the setup used to put the cube into the case are both
 * *derived* from the algorithm (see src/data/cases.js), so a diagram can never
 * disagree with the case it labels.
 *
 * Every algorithm in this file is checked by src/data/cases.test.js: the 57
 * cases must form 57 distinct OLL classes and, together with the solved state,
 * account for all 58 classes the state space allows. A single wrong algorithm
 * shows up as either a duplicate or a gap.
 */

export const OLL_GROUPS = [
  'Dot',
  'Line',
  'Cross',
  'Corners oriented',
  'Square',
  'L shape',
  'Lightning',
  'Fish',
  'Knight move',
  'Awkward',
  'P shape',
  'T shape',
  'C shape',
  'W shape',
  'Big lightning',
];

export const OLL_CASES = [
  // --- Dot: no edges oriented -------------------------------------------
  { number: 1, name: 'Runway', group: 'Dot', algs: ["R U2 R2 F R F' U2 R' F R F'"] },
  {
    number: 2,
    name: 'Zamboni',
    group: 'Dot',
    algs: [
      "F R U R' U' F' f R U R' U' f'",
      "r U r' U2 r U2 R' U2 R U' r'",
      "F R U R' U' S R U R' U' f'",
    ],
  },
  {
    number: 3,
    name: 'Anti-Mounted Fish',
    group: 'Dot',
    algs: ["f R U R' U' f' U' F R U R' U' F'", "r' R2 U R' U r U2 r' U M'"],
  },
  {
    number: 4,
    name: 'Mounted Fish',
    group: 'Dot',
    algs: ["f R U R' U' f' U F R U R' U' F'", "M U' r U2 r' U' R U' R' M'"],
  },
  {
    number: 17,
    name: 'Slash',
    group: 'Dot',
    algs: ["R U R' U R' F R F' U2 R' F R F'", "F R' F' R2 r' U R U' R' U' M'"],
  },
  {
    number: 18,
    name: 'Crown',
    group: 'Dot',
    algs: ["r U R' U R U2 r2 U' R U' R' U2 r", "R U2 R2 F R F' U2 M' U R U' r'"],
  },
  {
    number: 19,
    name: 'Bunny',
    group: 'Dot',
    algs: ["M U R U R' U' M' R' F R F'", "r' R U R U R' U' r R2 F R F'"],
  },
  {
    number: 20,
    name: 'Checkers',
    group: 'Dot',
    algs: ["M U R U R' U' M2 U R U' r'", "r U R' U' M2 U R U' R' U' M'"],
  },

  // --- Line ---------------------------------------------------------------
  {
    number: 51,
    name: 'Bottlecap',
    group: 'Line',
    algs: ["f R U R' U' R U R' U' f'", "F U R U' R' U R U' R' F'"],
  },
  {
    number: 52,
    name: 'Rice Cooker',
    group: 'Line',
    algs: ["R U R' U R U' B U' B' R'", "R' U' R U' R' U F' U F R"],
  },
  {
    number: 55,
    name: 'Highway',
    group: 'Line',
    algs: ["R U2 R2 U' R U' R' U2 F R F'", "R' F U R U' R2 F' R2 U R' U' R"],
  },
  {
    number: 56,
    name: 'Streetlights',
    group: 'Line',
    algs: [
      "r U r' U R U' R' U R U' R' r U' r'",
      "F R U R' U' R F' r U R' U' r'",
      "r' U' r U' R' U R U' R' U R r' U r",
    ],
  },

  // --- Cross: all edges oriented -----------------------------------------
  {
    number: 21,
    name: 'Double Sune',
    group: 'Cross',
    algs: ["R U2 R' U' R U R' U' R U' R'", "R U R' U R U' R' U R U2 R'"],
  },
  {
    number: 22,
    name: 'Pi',
    group: 'Cross',
    algs: ["R U2 R2 U' R2 U' R2 U2 R", "R' U2 R2 U R2 U R2 U2 R'"],
  },
  {
    number: 23,
    name: 'Headlights',
    group: 'Cross',
    algs: ["R2 D R' U2 R D' R' U2 R'", "R2 D' R U2 R' D R U2 R"],
  },
  {
    number: 24,
    name: 'Chameleon',
    group: 'Cross',
    algs: ["r U R' U' r' F R F'", "x' R U R' D R U' R' D' x"],
  },
  {
    number: 25,
    name: 'Bowtie',
    group: 'Cross',
    algs: ["F' r U R' U' r' F R", "R' F R B' R' F' R B", "x' R U' R' D R U R' D' x"],
  },
  {
    number: 26,
    name: 'Antisune',
    group: 'Cross',
    algs: ["R U2 R' U' R U' R'", "L' U' L U' L' U2 L"],
  },
  { number: 27, name: 'Sune', group: 'Cross', algs: ["R U R' U R U2 R'", "L U L' U L U2 L'"] },

  // --- Corners oriented, edges flipped ------------------------------------
  {
    number: 28,
    name: 'Duck',
    group: 'Corners oriented',
    algs: ["r U R' U' r' R U R U' R'", "M' U M U2 M' U M"],
  },
  {
    number: 57,
    name: 'Mummy',
    group: 'Corners oriented',
    algs: ["R U R' U' M' U R U' r'", "M' U M' U M' U2 M U M U M U2"],
  },

  // --- Square -------------------------------------------------------------
  {
    number: 5,
    name: 'Wide Antisune',
    group: 'Square',
    algs: ["r' U2 R U R' U r", "l' U2 L U L' U l"],
  },
  {
    number: 6,
    name: 'Wide Sune',
    group: 'Square',
    algs: ["r U2 R' U' R U' r'", "l U2 L' U' L U' l'"],
  },

  // --- L shape ------------------------------------------------------------
  {
    number: 47,
    name: 'Right Front Squeegee',
    group: 'L shape',
    algs: ["R' U' R' F R F' R' F R F' U R", "F' L' U' L U L' U' L U F"],
  },
  { number: 48, name: 'Left Front Squeegee', group: 'L shape', algs: ["F R U R' U' R U R' U' F'"] },
  {
    number: 49,
    name: 'Right Back Squeegee',
    group: 'L shape',
    algs: ["r U' r2 U r2 U r2 U' r", "R B' R2 F R2 B R2 F' R"],
  },
  {
    number: 50,
    name: 'Left Back Squeegee',
    group: 'L shape',
    algs: ["r' U r2 U' r2 U' r2 U r'", "R' F R2 B' R2 F' R2 B R'"],
  },
  {
    number: 53,
    name: 'Frying Pan',
    group: 'L shape',
    algs: [
      "r' U' R U' R' U R U' R' U2 r",
      "l' U' L U' L' U L U' L' U2 l",
      "r' U2 R U R' U' R U R' U r",
    ],
  },
  {
    number: 54,
    name: 'Anti-Frying Pan',
    group: 'L shape',
    algs: [
      "r U R' U R U' R' U R U2 r'",
      "l U L' U L U' L' U L U2 l'",
      "r U2 R' U' R U R' U' R U' r'",
    ],
  },

  // --- Lightning ----------------------------------------------------------
  { number: 7, name: 'Lightning', group: 'Lightning', algs: ["r U R' U R U2 r'"] },
  {
    number: 8,
    name: 'Reverse Lightning',
    group: 'Lightning',
    algs: ["r' U' R U' R' U2 r", "l' U' L U' L' U2 l"],
  },
  {
    number: 11,
    name: 'Downstairs',
    group: 'Lightning',
    algs: ["r U R' U R' F R F' R U2 r'", "r' R2 U R' U R U2 R' U M'"],
  },
  {
    number: 12,
    name: 'Upstairs',
    group: 'Lightning',
    algs: [
      "M' R' U' R U' R' U2 R U' R r'",
      "F R U R' U' F' U F R U R' U' F'",
      "M' R' U' R U' R' U2 R U' M",
    ],
  },

  // --- Fish ---------------------------------------------------------------
  { number: 9, name: 'Kite', group: 'Fish', algs: ["R U R' U' R' F R2 U R' U' F'"] },
  { number: 10, name: 'Anti-Kite', group: 'Fish', algs: ["R U R' U R' F R F' R U2 R'"] },
  { number: 35, name: 'Fish Salad', group: 'Fish', algs: ["R U2 R2 F R F' R U2 R'"] },
  {
    number: 37,
    name: 'Mounted Fish',
    group: 'Fish',
    algs: ["F R U' R' U' R U R' F'", "F R' F' R U R U' R'"],
  },

  // --- Knight move --------------------------------------------------------
  {
    number: 13,
    name: 'Gun',
    group: 'Knight move',
    algs: ["r U' r' U' r U r' F' U F", "F U R U' R2 F' R U R U' R'"],
  },
  { number: 14, name: 'Anti-Gun', group: 'Knight move', algs: ["R' F R U R' F' R F U' F'"] },
  {
    number: 15,
    name: 'Squeegee',
    group: 'Knight move',
    algs: ["r' U' r R' U' R U r' U r", "l' U' l L' U' L U l' U l"],
  },
  {
    number: 16,
    name: 'Anti-Squeegee',
    group: 'Knight move',
    algs: ["r U r' R U R' U' r U' r'", "l U l' L U L' U' l U' l'"],
  },

  // --- Awkward ------------------------------------------------------------
  {
    number: 29,
    name: 'Spotted Chameleon',
    group: 'Awkward',
    algs: ["M U R U R' U' R' F R F' M'", "R U R' U' R U' R' F' U' F R U R'"],
  },
  {
    number: 30,
    name: 'Anti-Spotted Chameleon',
    group: 'Awkward',
    algs: ["F U R U2 R' U' R U2 R' U' F'", "F R' F R2 U' R' U' R U R' F2"],
  },
  { number: 41, name: 'Awkward Fish', group: 'Awkward', algs: ["R U R' U R U2 R' F R U R' U' F'"] },
  {
    number: 42,
    name: 'Anti-Awkward Fish',
    group: 'Awkward',
    algs: ["R' U' R U' R' U2 R F R U R' U' F'"],
  },

  // --- P shape ------------------------------------------------------------
  {
    number: 31,
    name: 'Couch',
    group: 'P shape',
    algs: ["R' U' F U R U' R' F' R", "S' L' U' L U L F' L' f"],
  },
  {
    number: 32,
    name: 'Anti-Couch',
    group: 'P shape',
    algs: ["R U B' U' R' U R B R'", "L U F' U' L' U L F L'", "S R U R' U' R' F R f'"],
  },
  { number: 43, name: 'Anti-Fung', group: 'P shape', algs: ["f' L' U' L U f", "R' U' F' U F R"] },
  { number: 44, name: 'Fung', group: 'P shape', algs: ["f R U R' U' f'", "F U R U' R' F'"] },

  // --- T shape ------------------------------------------------------------
  { number: 33, name: 'Key', group: 'T shape', algs: ["R U R' U' R' F R F'"] },
  { number: 45, name: 'Suit Up', group: 'T shape', algs: ["F R U R' U' F'"] },

  // --- C shape ------------------------------------------------------------
  {
    number: 34,
    name: 'City',
    group: 'C shape',
    algs: ["R U R2 U' R' F R U R U' F'", "F R U R' U' R' F' r U R U' r'"],
  },
  { number: 46, name: 'Seein Headlights', group: 'C shape', algs: ["R' U' R' F R F' U R"] },

  // --- W shape ------------------------------------------------------------
  { number: 36, name: 'Wario', group: 'W shape', algs: ["L' U' L U' L' U L U L F' L' F"] },
  { number: 38, name: 'Mario', group: 'W shape', algs: ["R U R' U R U' R' U' R' F R F'"] },

  // --- Big lightning ------------------------------------------------------
  {
    number: 39,
    name: 'Big Lightning',
    group: 'Big lightning',
    algs: ["L F' L' U' L U F U' L'", "R B' R' U' R U B U' R'", "f' L F L' U' L' U L S"],
  },
  {
    number: 40,
    name: 'Anti-Big Lightning',
    group: 'Big lightning',
    algs: ["R' F R U R' U' F' U R"],
  },
];
