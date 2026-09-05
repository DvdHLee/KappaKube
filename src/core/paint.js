/**
 * Painting a cube state in, sticker by sticker.
 *
 * The model is a partial map from facelet to colour. Everything else — what may
 * be painted next, what can be deduced, whether the result is a cube that could
 * exist — is derived from one idea: a slot may only hold a real piece, in a
 * real orientation, that has not been used elsewhere.
 *
 * Working in whole pieces rather than loose stickers is what makes both the
 * checking and the inference fall out. A corner with two stickers filled has
 * only one piece that fits them *in that order*, so the third colour is forced;
 * once three of a colour's edges are placed the fourth is the only one left. No
 * special cases for either: both are the same "exactly one candidate remains".
 *
 * Only 2x2 and 3x3 are supported, which are the sizes worth painting — you paint
 * a state in order to solve it.
 */

import { FACES, FACE_NORMALS, applyMat, createSolvedCube, outerCoord } from './cube.js';
import { toPatternData } from './kpattern.js';
import { ROTATIONS } from './serialize.js';

export const PAINTABLE_SIZES = [2, 3];

export function canPaint(n) {
  return PAINTABLE_SIZES.includes(n);
}

const NORMAL_TO_FACE = {};
for (const face of FACES) NORMAL_TO_FACE[FACE_NORMALS[face].join(',')] = face;

export const faceletKey = (pos, face) => `${pos.join(',')}|${face}`;

/** Every outward-facing sticker position, grouped by the piece it belongs to. */
export function slotsOf(n) {
  const outer = outerCoord(n);
  return createSolvedCube(n)
    .cubies.map((cubie) => {
      const faces = Object.keys(cubie.stickers);
      return {
        pos: cubie.pos,
        faces,
        keys: faces.map((face) => faceletKey(cubie.pos, face)),
        kind: faces.length === 3 ? 'corner' : faces.length === 2 ? 'edge' : 'centre',
      };
    })
    .filter((slot) => slot.kind !== 'centre' || n % 2 === 1)
    .map((slot) => ({ ...slot, outer }));
}

/**
 * The pieces available to place: every non-centre piece of a solved cube.
 * A centre is not a piece to be placed — on an odd cube it is the fixed
 * reference the colours are named against.
 */
function piecesOf(n) {
  return createSolvedCube(n)
    .cubies.filter((c) => Object.keys(c.stickers).length > 1)
    .map((c) => ({ id: c.id, stickers: c.stickers }));
}

/**
 * Where a piece's stickers land when it is turned by `rotation`.
 * @returns {Record<string, string>} world face -> colour
 */
function placementFor(piece, rotation) {
  const shown = {};
  for (const local in piece.stickers) {
    const face = NORMAL_TO_FACE[applyMat(rotation, FACE_NORMALS[local]).join(',')];
    shown[face] = piece.stickers[local];
  }
  return shown;
}

/** Every way a piece can sit in a slot, precomputed once per size. */
const placementCache = new Map();
function placements(n) {
  if (placementCache.has(n)) return placementCache.get(n);

  const bySlot = new Map();
  for (const slot of slotsOf(n)) {
    if (slot.kind === 'centre') continue;
    const options = [];
    for (const piece of piecesOf(n)) {
      if (Object.keys(piece.stickers).length !== slot.faces.length) continue;
      for (let r = 0; r < ROTATIONS.length; r++) {
        const shown = placementFor(piece, ROTATIONS[r]);
        // The piece has to face outward on exactly this slot's faces.
        if (Object.keys(shown).length !== slot.faces.length) continue;
        if (!slot.faces.every((f) => shown[f] !== undefined)) continue;
        options.push({ pieceId: piece.id, rotation: r, shown });
      }
    }
    bySlot.set(slot.keys.join('&'), { slot, options });
  }

  placementCache.set(n, bySlot);
  return bySlot;
}

/**
 * A blank painting.
 *
 * The fixed reference is filled in already: an odd cube's centres, which name
 * the colours, and a 2x2's back-bottom-left corner, which stands in for the
 * centres it does not have. Everything else starts unpainted.
 */
export function createPainting(n) {
  if (!canPaint(n)) throw new Error(`Cannot paint a ${n}x${n}`);

  const colours = {};
  const solved = createSolvedCube(n);
  const outer = outerCoord(n);

  for (const cubie of solved.cubies) {
    const faces = Object.keys(cubie.stickers);
    const isCentre = faces.length === 1;
    const isReference =
      n === 2 && cubie.pos[0] === -outer && cubie.pos[1] === -outer && cubie.pos[2] === -outer;
    if (!isCentre && !isReference) continue;
    for (const face of faces) colours[faceletKey(cubie.pos, face)] = cubie.stickers[face];
  }

  return { n, colours, fixed: Object.keys(colours) };
}

/** Facelets the user may paint: everything but the fixed reference. */
export function editableFacelets(painting) {
  const fixed = new Set(painting.fixed);
  return slotsOf(painting.n)
    .filter((slot) => slot.kind !== 'centre')
    .flatMap((slot) => slot.keys.map((key, i) => ({ key, pos: slot.pos, face: slot.faces[i] })))
    .filter((f) => !fixed.has(f.key));
}

/**
 * Can the open slots all be filled at once from the pieces left?
 *
 * Checking slots one at a time is not enough. Colour five corners yellow and
 * every one of them still has candidates — but only four corner pieces carry
 * yellow, so no arrangement exists. That is a counting problem, and the honest
 * way to answer it is to look for a perfect matching between slots and pieces
 * rather than to special-case "four of each".
 *
 * Kuhn's algorithm; the graph is at most twenty a side, so this is nothing.
 */
function hasPerfectMatching(open) {
  const takenBy = new Map(); // pieceId -> index into `open`

  const assign = (i, seen) => {
    for (const piece of open[i].pieces) {
      if (seen.has(piece)) continue;
      seen.add(piece);
      const holder = takenBy.get(piece);
      if (holder === undefined || assign(holder, seen)) {
        takenBy.set(piece, i);
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < open.length; i++) {
    if (!assign(i, new Set())) return false;
  }
  return true;
}

const TOO_FEW = 'Not enough pieces are left with those colours.';
const NO_PIECE = 'No real piece fits that combination.';

/**
 * Work out everything the painting already forces.
 *
 * Two rounds of reasoning. First the easy one: a slot with a single candidate
 * placement is settled, which frees information for its neighbours. When that
 * stalls, the harder one: a candidate is only genuinely available if the *rest*
 * of the cube can still be filled once it is taken, so each is tested by
 * checking a matching survives without it. That is what turns "three of this
 * colour are already placed" into a deduction about the fourth.
 *
 * @returns {{ ok: boolean, colours: object, assigned: Map, reason?: string }}
 */
export function propagate(painting) {
  const bySlot = placements(painting.n);
  const colours = { ...painting.colours };
  const assigned = new Map();
  const used = new Set();

  const fitsFor = (slot, options) =>
    options.filter((option) => {
      if (used.has(option.pieceId)) return false;
      return slot.faces.every((face) => {
        const painted = colours[faceletKey(slot.pos, face)];
        return painted === undefined || painted === option.shown[face];
      });
    });

  const settle = (id, slot, option) => {
    assigned.set(id, { slot, ...option });
    used.add(option.pieceId);
    for (const face of slot.faces) colours[faceletKey(slot.pos, face)] = option.shown[face];
  };

  for (let pass = 0; pass < 64; pass++) {
    let settled = false;

    // Round one: slots with only one possible placement.
    for (const [id, { slot, options }] of bySlot) {
      if (assigned.has(id)) continue;
      const fits = fitsFor(slot, options);
      if (fits.length === 0) return { ok: false, colours, assigned, reason: NO_PIECE };
      if (fits.length > 1) continue;
      settle(id, slot, fits[0]);
      settled = true;
    }
    if (settled) continue;

    // Round two: everything still open has to be fillable together.
    const open = [];
    for (const [id, { slot, options }] of bySlot) {
      if (assigned.has(id)) continue;
      const fits = fitsFor(slot, options);
      open.push({ id, slot, fits, pieces: [...new Set(fits.map((f) => f.pieceId))] });
    }
    if (open.length === 0) break;

    if (!hasPerfectMatching(open)) {
      return { ok: false, colours, assigned, reason: TOO_FEW };
    }

    // A candidate that leaves the rest unfillable was never really a candidate.
    for (const entry of open) {
      if (entry.fits.length <= 1) continue;

      const viable = entry.fits.filter((candidate) => {
        const rest = open
          .filter((other) => other.id !== entry.id)
          .map((other) => ({
            ...other,
            pieces: other.pieces.filter((p) => p !== candidate.pieceId),
          }));
        return rest.every((o) => o.pieces.length > 0) && hasPerfectMatching(rest);
      });

      if (viable.length === 0) return { ok: false, colours, assigned, reason: TOO_FEW };
      if (viable.length === 1) {
        settle(entry.id, entry.slot, viable[0]);
        settled = true;
      }
    }

    if (!settled) break;
  }

  return { ok: true, colours, assigned };
}

/** Is every piece placed? */
export function isComplete(painting) {
  const result = propagate(painting);
  const slots = [...placements(painting.n).keys()].length;
  return result.ok && result.assigned.size === slots;
}

/** The cube a finished painting describes, or null if it is not finished. */
export function paintingToCube(painting) {
  const result = propagate(painting);
  const bySlot = placements(painting.n);
  if (!result.ok || result.assigned.size !== bySlot.size) return null;

  const solved = createSolvedCube(painting.n);
  const cubies = solved.cubies.map((c) => ({ ...c }));

  // Cubies stay in piece order, the way the rest of the model keeps them —
  // indexing by slot instead would reorder the array and break every
  // comparison that walks the two cubes side by side.
  const slotOfPiece = new Map(solved.cubies.map((c, i) => [c.id, i]));

  for (const { slot, pieceId, rotation } of result.assigned.values()) {
    const at = slotOfPiece.get(pieceId);
    cubies[at] = {
      id: pieceId,
      pos: slot.pos.slice(),
      rot: ROTATIONS[rotation].slice(),
      stickers: cubies[at].stickers,
    };
  }

  return { n: painting.n, cubies };
}

const sign = (perm) => {
  let swaps = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) swaps++;
  }
  return swaps % 2 === 0 ? 1 : -1;
};

/**
 * Could a real cube be in this state?
 *
 * Every piece being real and used once is not enough: you cannot twist a single
 * corner, flip a single edge, or swap just two pieces, however convincing the
 * result looks. Those three parities are what separate a painted cube from a
 * physically possible one.
 *
 * The orientation numbers come from the same conversion the solver uses, which
 * is checked against cubing.js — so this asks the question in exactly the terms
 * a solver would.
 */
export function isReachable(cube) {
  const { CORNERS, EDGES } = toPatternData(cube);

  const twist = CORNERS.orientation.reduce((a, b) => a + b, 0);
  if (twist % 3 !== 0) {
    return { ok: false, reason: 'A single corner is twisted, which a real cube cannot be.' };
  }

  // A 2x2 has no fixed centres, so any arrangement of its corners is reachable
  // by turning the whole cube; only the twist is constrained.
  if (!EDGES) return { ok: true };

  const flip = EDGES.orientation.reduce((a, b) => a + b, 0);
  if (flip % 2 !== 0) {
    return { ok: false, reason: 'A single edge is flipped, which a real cube cannot be.' };
  }

  if (sign(CORNERS.pieces) !== sign(EDGES.pieces)) {
    return { ok: false, reason: 'Two pieces are swapped, which a real cube cannot be.' };
  }

  return { ok: true };
}

/**
 * Paint one facelet, then work through everything it forces.
 *
 * Rejected rather than applied if the result could not be a real cube — either
 * because no piece fits, or because the finished cube would need a lone twist,
 * flip or swap. The painting is returned unchanged in that case, so an
 * impossible state can never be entered in the first place.
 *
 * @returns {{ ok: boolean, painting: object, reason?: string }}
 */
export function paintFacelet(painting, key, colour) {
  if (painting.fixed.includes(key)) {
    return { ok: false, painting, reason: 'That sticker is part of the fixed reference.' };
  }

  const attempt = { ...painting, colours: { ...painting.colours, [key]: colour } };
  const result = propagate(attempt);
  if (!result.ok) return { ok: false, painting, reason: result.reason };

  const next = { ...attempt, colours: result.colours };

  // Parity can only be judged once every piece is placed.
  const cube = paintingToCube(next);
  if (cube) {
    const reachable = isReachable(cube);
    if (!reachable.ok) return { ok: false, painting, reason: reachable.reason };
  }

  return { ok: true, painting: next };
}

/** Remove a painted sticker, keeping the fixed reference intact. */
export function clearFacelet(painting, key) {
  if (painting.fixed.includes(key)) return painting;
  const colours = { ...painting.colours };
  delete colours[key];
  return { ...painting, colours };
}

/** How the painting stands: what is left, and whether it describes a real cube. */
export function paintStatus(painting) {
  const total = editableFacelets(painting).length;
  const painted = editableFacelets(painting).filter((f) => painting.colours[f.key]).length;
  const cube = paintingToCube(painting);

  return {
    painted,
    total,
    complete: Boolean(cube),
    cube,
    reachable: cube ? isReachable(cube).ok : false,
  };
}
