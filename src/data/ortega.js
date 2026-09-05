/**
 * The Ortega method for 2x2: solve a face, orient the last layer, then permute
 * both layers at once.
 *
 * As with the 3x3 sets, only the identity and the algorithms are authored here.
 * src/data/cases.test.js proves the seven OLL cases are exactly the seven
 * orientations a 2x2 last layer can be in.
 */

export const ORTEGA_OLL_GROUP = 'Orient last layer';
export const ORTEGA_PBL_GROUP = 'Permute both layers';

export const ORTEGA_OLL = [
  { id: 'Sune', name: 'Sune', algs: ["R U R' U R U2 R'"] },
  { id: 'Antisune', name: 'Antisune', algs: ["R U2 R' U' R U' R'"] },
  { id: 'H', name: 'H / Double adjacent', algs: ['R2 U2 R U2 R2'] },
  { id: 'Pi', name: 'Pi / Bruno', algs: ["F R U R' U' R U R' U' F'"] },
  { id: 'T', name: 'T', algs: ["R U R' U' R' F R F'"] },
  { id: 'U', name: 'U / Headlights', algs: ["F R U R' U' F'"] },
  { id: 'L', name: 'L / Chameleon', algs: ["F R' F' R U R U' R'"] },
];

export const ORTEGA_PBL = [
  { id: 'AdjAdj', name: 'Adjacent / adjacent', algs: ["R2 U' B2 U2 R2 U' R2"] },
  { id: 'DiagDiag', name: 'Diagonal / diagonal', algs: ['R2 F2 R2'] },
  { id: 'TopAdj', name: 'Bottom done, adjacent top', algs: ["R U' R F2 R' U R'"] },
  { id: 'TopDiag', name: 'Bottom done, diagonal top', algs: ["R2 F2 R2 U' R2 F2 R2"] },
  { id: 'AdjDiag', name: 'Adjacent / diagonal', algs: ["R U' R' U' F2 U' R U R' D R2"] },
];
