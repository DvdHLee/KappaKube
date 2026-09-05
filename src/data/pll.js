/**
 * The 21 PLL cases, grouped by permutation letter.
 *
 * As with OLL, only the identity and the algorithms are authored; the setup and
 * the recognition diagram are derived. src/data/cases.test.js requires the 21
 * to form 21 distinct PLL classes covering, with the solved state, all 22 the
 * state space allows.
 */

export const PLL_GROUPS = ['A', 'U', 'H', 'Z', 'J', 'T', 'R', 'F', 'G', 'V', 'Y', 'N', 'E'];

export const PLL_CASES = [
  // --- A perms: corner 3-cycle -------------------------------------------
  {
    id: 'Aa',
    name: 'Aa perm',
    group: 'A',
    algs: ["x R' U R' D2 R U' R' D2 R2 x'", "R' F R' B2 R F' R' B2 R2"],
  },
  {
    id: 'Ab',
    name: 'Ab perm',
    group: 'A',
    algs: ["x R2 D2 R U R' D2 R U' R x'", "R B' R F2 R' B R F2 R2"],
  },

  // --- U perms: edge 3-cycle ---------------------------------------------
  {
    id: 'Ua',
    name: 'Ua perm',
    group: 'U',
    algs: ["R U' R U R U R U' R' U' R2", "M2 U M U2 M' U M2"],
  },
  {
    id: 'Ub',
    name: 'Ub perm',
    group: 'U',
    algs: ["R2 U R U R' U' R' U' R' U R'", "M2 U' M U2 M' U' M2"],
  },

  // --- Edge cases ---------------------------------------------------------
  {
    id: 'H',
    name: 'H perm',
    group: 'H',
    algs: ['M2 U M2 U2 M2 U M2', "M2 U' M2 U2 M2 U' M2", "M2 U2 M2 U' M2 U2 M2 U'"],
  },
  {
    id: 'Z',
    name: 'Z perm',
    group: 'Z',
    algs: ["M' U M2 U M2 U M' U2 M2", "M2 U M2 U M' U2 M2 U2 M' U2", "M' U' M2 U' M2 U' M' U2 M2"],
  },

  // --- J perms: adjacent corner swap --------------------------------------
  {
    id: 'Ja',
    name: 'Ja perm',
    group: 'J',
    algs: [
      "x R2 F R F' R U2 r' U r U2 x'",
      "R' U L' U2 R U' R' U2 R L",
      "L' U' L F L' U' L U L F' L2 U L U",
    ],
  },
  {
    id: 'Jb',
    name: 'Jb perm',
    group: 'J',
    algs: ["R U R' F' R U R' U' R' F R2 U' R' U'", "R U2 R' U' R U2 L' U R' U' L"],
  },

  // --- T perm -------------------------------------------------------------
  {
    id: 'T',
    name: 'T perm',
    group: 'T',
    algs: ["R U R' U' R' F R2 U' R' U' R U R' F'", "R2 U R2 U' R2 U' D R2 U' R2 U R2 D'"],
  },

  // --- R perms ------------------------------------------------------------
  {
    id: 'Ra',
    name: 'Ra perm',
    group: 'R',
    algs: ["R U' R' U' R U R D R' U' R D' R' U2 R'", "L U2 L' U2 L F' L' U' L U L F L2"],
  },
  {
    id: 'Rb',
    name: 'Rb perm',
    group: 'R',
    algs: ["R' U2 R U2 R' F R U R' U' R' F' R2", "R2 F R U R U' R' F' R U2 R' U2 R"],
  },

  // --- F perm -------------------------------------------------------------
  { id: 'F', name: 'F perm', group: 'F', algs: ["R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R"] },

  // --- G perms: corner and edge 3-cycles ----------------------------------
  {
    id: 'Ga',
    name: 'Ga perm',
    group: 'G',
    algs: ["R2 U R' U R' U' R U' R2 U' D R' U R D'", "R2 U R' U R' U' R U' R2 D U' R' U R D'"],
  },
  { id: 'Gb', name: 'Gb perm', group: 'G', algs: ["R' U' R U D' R2 U R' U R U' R U' R2 D"] },
  {
    id: 'Gc',
    name: 'Gc perm',
    group: 'G',
    algs: ["R2 U' R U' R U R' U R2 U D' R U' R' D", "R2 U' R U' R U R' U R2 D' U R U' R' D"],
  },
  {
    id: 'Gd',
    name: 'Gd perm',
    group: 'G',
    algs: ["R U R' U' D R2 U' R U' R' U R' U R2 D'", "R U R' U' D R2 U' R U' R' U R' U R2 U D'"],
  },

  // --- Diagonal corner swaps ----------------------------------------------
  {
    id: 'V',
    name: 'V perm',
    group: 'V',
    algs: [
      // The commonly written form uses `y` (or the equivalent `d'`), which
      // leaves the centres cycled — fine at a real cube, wrong for a teacher
      // that has to end on a solved state. Both of these restore the centres.
      "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2",
      "z D' R2 D R2 U R' D' R U' R U R' D R U' z'",
    ],
  },
  {
    id: 'Y',
    name: 'Y perm',
    group: 'Y',
    algs: [
      "F R U' R' U' R U R' F' R U R' U' R' F R F'",
      "F R' F R2 U' R' U' R U R' F' R U R' U' F'",
    ],
  },
  {
    id: 'Na',
    name: 'Na perm',
    group: 'N',
    algs: ["R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'"],
  },
  {
    id: 'Nb',
    name: 'Nb perm',
    group: 'N',
    algs: [
      "R' U R U' R' F' U' F R U R' F R' F' R U' R",
      "r' D' F r U' r' F' D r2 U r' U' r' F r F'",
    ],
  },

  // --- E perm -------------------------------------------------------------
  {
    id: 'E',
    name: 'E perm',
    group: 'E',
    algs: [
      "x' L' U L D' L' U' L D L' U' L D' L' U L D x",
      "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
    ],
  },
];
