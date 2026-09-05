/**
 * Pure cube model. No React, no three.js — deliberately.
 *
 * Coordinates live on an integer lattice with step 2, centred on the origin:
 *   n = 3 -> {-2, 0, 2}      n = 4 -> {-3, -1, 1, 3}
 * Using step 2 keeps every coordinate an integer for both odd and even n, so
 * comparisons are exact and layer selection is a plain equality test.
 *
 * Orientation is an integer 3x3 matrix, not a quaternion. Every cubie
 * orientation is one of the 24 cube rotations, whose matrices have entries in
 * {-1, 0, 1} — so composition stays exact integer arithmetic with no drift and
 * no epsilon comparisons, however many moves are applied. Quaternions for those
 * same rotations need irrational components. The renderer converts to a
 * quaternion at the boundary, which is the only place floats are wanted.
 *
 * @typedef {[number, number, number]} Vec3
 * @typedef {number[]} Mat3 row-major, length 9, maps local space to world space
 * @typedef {{ id: number, pos: Vec3, rot: Mat3, stickers: Record<string, string> }} Cubie
 * @typedef {{ n: number, cubies: Cubie[] }} Cube
 */

export const FACES = ['U', 'D', 'R', 'L', 'F', 'B'];

/** Outward unit normal of each face. Faces are positions, never colours. */
export const FACE_NORMALS = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

/** Which axis a face lies on, and which way along it. */
export const FACE_AXIS = { U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z' };
export const FACE_SIGN = { U: 1, D: -1, R: 1, L: -1, F: 1, B: -1 };

export const AXES = ['x', 'y', 'z'];
export const AXIS_INDEX = { x: 0, y: 1, z: 2 };

/** The positive- and negative-facing face on each axis. */
export const AXIS_FACES = {
  x: { pos: 'R', neg: 'L' },
  y: { pos: 'U', neg: 'D' },
  z: { pos: 'F', neg: 'B' },
};

export const IDENTITY = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1]);

const NORMAL_TO_FACE = {};
for (const face of FACES) NORMAL_TO_FACE[FACE_NORMALS[face].join(',')] = face;

/** Lattice coordinate of layer index i (0-based) on a cube of size n. */
export function latticeCoord(i, n) {
  return 2 * i - (n - 1);
}

/** The outermost lattice coordinate: cubies here are on the surface. */
export function outerCoord(n) {
  return n - 1;
}

/** Lattice coordinates -> world position. Lattice step is 2, world step is `spacing`. */
export function latticeToWorld(pos, spacing) {
  return [pos[0] * spacing * 0.5, pos[1] * spacing * 0.5, pos[2] * spacing * 0.5];
}

/** m . v */
export function applyMat(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** a . b */
export function matMul(a, b) {
  const out = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

/**
 * Build a solved cube of size n.
 *
 * Each cubie carries its stickers keyed by *local* direction. At solved state the
 * local frame matches the world frame, so key and colour agree — once a cubie is
 * turned its `rot` changes and the sticker keys stay put, which is exactly what
 * the renderer wants (stickers are fixed to the piece) and what makes a cubie's
 * colour set immutable for the life of the app.
 *
 * The fully interior cubie(s) carry no stickers and are omitted: 26 for n = 3.
 */
export function createSolvedCube(n = 3) {
  const outer = outerCoord(n);
  const cubies = [];
  let id = 0;

  for (let xi = 0; xi < n; xi++) {
    for (let yi = 0; yi < n; yi++) {
      for (let zi = 0; zi < n; zi++) {
        const pos = [latticeCoord(xi, n), latticeCoord(yi, n), latticeCoord(zi, n)];

        const stickers = {};
        for (const face of FACES) {
          const axis = AXIS_INDEX[FACE_AXIS[face]];
          if (pos[axis] === FACE_SIGN[face] * outer) stickers[face] = face;
        }

        if (Object.keys(stickers).length === 0) continue; // interior, never visible

        cubies.push({ id: id++, pos, rot: IDENTITY.slice(), stickers });
      }
    }
  }

  return { n, cubies };
}

/** Which world face a cubie's local direction currently points at. */
export function worldFaceOf(cubie, localFace) {
  return NORMAL_TO_FACE[applyMat(cubie.rot, FACE_NORMALS[localFace]).join(',')];
}

/**
 * Every visible sticker, tagged with the world face it currently shows on.
 * This is the seed of the facelet notation in Phase 7 and the basis of isSolved.
 */
export function surfaceStickers(cube) {
  const out = [];
  for (const cubie of cube.cubies) {
    for (const localFace in cubie.stickers) {
      out.push({
        cubieId: cubie.id,
        face: worldFaceOf(cubie, localFace),
        color: cubie.stickers[localFace],
      });
    }
  }
  return out;
}

/**
 * Solved means every face shows a single colour.
 *
 * Note this is deliberately orientation-agnostic: a whole-cube rotation permutes
 * which colour sits on which face but leaves the cube solved, which is the
 * conventional meaning and what the x/y/z tests rely on.
 */
export function isSolved(cube) {
  const seen = {};
  for (const { face, color } of surfaceStickers(cube)) {
    if (seen[face] === undefined) seen[face] = color;
    else if (seen[face] !== color) return false;
  }
  return true;
}

/**
 * A canonical description of everything a viewer can actually see: which colour
 * shows on which face of which slot.
 *
 * This is the right notion of "same cube" for a normal puzzle. It deliberately
 * ignores a centre's rotation about its own normal, which is unobservable
 * because a centre has one sticker — real algorithms twist centres routinely
 * (a T-perm nets one quarter turn of U), so a strict orientation comparison
 * would report a visually solved cube as unsolved.
 */
export function visibleState(cube) {
  const entries = [];
  for (const cubie of cube.cubies) {
    for (const local in cubie.stickers) {
      entries.push(`${cubie.pos.join(',')}|${worldFaceOf(cubie, local)}=${cubie.stickers[local]}`);
    }
  }
  return entries.sort().join(' ');
}

export function sameVisibleState(a, b) {
  return a.n === b.n && visibleState(a) === visibleState(b);
}

/**
 * Exact structural equality: same piece, same slot, same orientation — including
 * centre twist. This is the *supercube* notion. Prefer sameVisibleState unless
 * you specifically mean to distinguish a twisted centre.
 */
export function cubesEqual(a, b) {
  if (a.n !== b.n || a.cubies.length !== b.cubies.length) return false;
  for (let i = 0; i < a.cubies.length; i++) {
    const x = a.cubies[i];
    const y = b.cubies[i];
    if (x.id !== y.id) return false;
    for (let k = 0; k < 3; k++) if (x.pos[k] !== y.pos[k]) return false;
    for (let k = 0; k < 9; k++) if (x.rot[k] !== y.rot[k]) return false;
  }
  return true;
}

export function cloneCube(cube) {
  return {
    n: cube.n,
    cubies: cube.cubies.map((c) => ({
      id: c.id,
      pos: c.pos.slice(),
      rot: c.rot.slice(),
      stickers: c.stickers,
    })),
  };
}
