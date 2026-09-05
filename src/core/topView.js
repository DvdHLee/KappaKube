import { outerCoord, worldFaceOf } from './cube.js';

/**
 * The last layer seen from above, for any cube size.
 *
 * Unlike the 3x3 and 2x2 versions this takes the cube to be in standard
 * orientation and reports sticker colours directly, which is sound for states
 * built from a solved cube by an algorithm that leaves the centres alone — the
 * parity cases check exactly that before using this.
 *
 * Grid is row-major with row 0 at the back and column 0 on the left, matching
 * the other two so one diagram component can draw any of them.
 */
function colorOn(cubie, face) {
  for (const local in cubie.stickers) {
    if (worldFaceOf(cubie, local) === face) return cubie.stickers[local];
  }
  return undefined;
}

export function topViewAnySize(cube) {
  const n = cube.n;
  const outer = outerCoord(n);

  const face = new Array(n * n).fill(null);
  const blank = () => new Array(n).fill(null);
  const sides = { N: blank(), E: blank(), S: blank(), W: blank() };

  for (const cubie of cube.cubies) {
    if (cubie.pos[1] !== outer) continue;

    const col = (cubie.pos[0] + outer) / 2;
    const row = (cubie.pos[2] + outer) / 2;

    face[row * n + col] = colorOn(cubie, 'U');
    if (cubie.pos[2] === -outer) sides.N[col] = colorOn(cubie, 'B');
    if (cubie.pos[2] === outer) sides.S[col] = colorOn(cubie, 'F');
    if (cubie.pos[0] === -outer) sides.W[row] = colorOn(cubie, 'L');
    if (cubie.pos[0] === outer) sides.E[row] = colorOn(cubie, 'R');
  }

  return { face, sides };
}
