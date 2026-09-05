import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { schemeFor } from '../core/scheme.js';
import {
  COLORS,
  CUBIE_RADIUS,
  CUBIE_SEGMENTS,
  CUBIE_SIZE,
  DEFAULT_FRONT,
  DEFAULT_TOP,
  INTERIOR_COLOR,
} from '../theme.js';

/**
 * Stickerless cubies.
 *
 * RoundedBoxGeometry is non-indexed and inherits BoxGeometry's six material
 * groups. It only *spherifies* the original box vertices, so each group still
 * covers one face plus its half of every adjacent bevel — meaning a per-group
 * colour puts the colour break exactly on the 45 degree edge line, which is
 * precisely how a moulded stickerless piece looks.
 *
 * Rather than a six-material mesh (six draw calls per cubie) we bake the groups
 * into a vertex-colour attribute and clear them: one draw call per cubie. At
 * 3x3 that is 26 instead of 156, and the gap widens fast on 5x5 and up.
 */

/** BoxGeometry emits its sides in this order; group i is side BOX_SIDES[i]. */
const BOX_SIDES = ['R', 'L', 'U', 'D', 'F', 'B'];

const baseGeometry = new RoundedBoxGeometry(
  CUBIE_SIZE,
  CUBIE_SIZE,
  CUBIE_SIZE,
  CUBIE_SEGMENTS,
  CUBIE_RADIUS,
);

/**
 * A cubie's colour *set* never changes — turning only moves and reorients the
 * piece — so each physical cubie maps to one geometry for the life of the app.
 * The cache is bounded by cubie count (26 for 3x3, and 26 for any size).
 */
const cache = new Map();
const scratchColor = new THREE.Color();

/** Face letter -> hex, for the scheme currently on screen. */
let faceColours = mapScheme(schemeFor(DEFAULT_TOP, DEFAULT_FRONT));

function mapScheme(scheme) {
  const out = {};
  for (const face in scheme) out[face] = COLORS[scheme[face]];
  return out;
}

function cacheKey(stickers) {
  return BOX_SIDES.map((side) => stickers[side] ?? '.').join('');
}

/** Fill a colour attribute from a sticker set, one flat colour per box side. */
function paint(colors, stickers) {
  baseGeometry.groups.forEach((group, i) => {
    const shown = stickers[BOX_SIDES[i]];
    // setStyle converts sRGB hex into the renderer's working colour space, the
    // same path material.color takes, so these match the palette exactly.
    scratchColor.setStyle(shown ? faceColours[shown] : INTERIOR_COLOR);
    const end = group.start + group.count;
    for (let v = group.start; v < end; v++) {
      colors[v * 3] = scratchColor.r;
      colors[v * 3 + 1] = scratchColor.g;
      colors[v * 3 + 2] = scratchColor.b;
    }
  });
}

/**
 * Geometry for a cubie whose local directions carry the given face colours.
 * Position/normal/uv attributes are shared with the base geometry — three keys
 * its GPU buffers by attribute object, so those upload exactly once — and only
 * the small colour attribute is per-variant.
 */
export function cubieGeometryFor(stickers) {
  const key = cacheKey(stickers);
  const hit = cache.get(key);
  if (hit) return hit;

  const colors = new Float32Array(baseGeometry.attributes.position.count * 3);
  paint(colors, stickers);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', baseGeometry.attributes.position);
  geometry.setAttribute('normal', baseGeometry.attributes.normal);
  geometry.setAttribute('uv', baseGeometry.attributes.uv);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  geometry.userData.stickers = stickers;

  cache.set(key, geometry);
  return geometry;
}

/**
 * Repaint every cached geometry for a new colour scheme.
 *
 * Rewriting the existing colour arrays in place, rather than building a fresh
 * geometry per scheme, keeps the cache at 26 entries however many times the
 * user changes their mind — and avoids disposing geometries whose position and
 * normal buffers are shared with every other variant.
 */
export function setColorScheme(scheme) {
  faceColours = mapScheme(scheme);
  for (const geometry of cache.values()) {
    const attribute = geometry.attributes.color;
    paint(attribute.array, geometry.userData.stickers);
    attribute.needsUpdate = true;
  }
}

/**
 * One material for the whole cube. Slight clearcoat reads as the glossy moulded
 * plastic of a stickerless cube without tipping into looking wet.
 */
export const cubieMaterial = new THREE.MeshPhysicalMaterial({
  vertexColors: true,
  roughness: 0.45,
  metalness: 0,
  clearcoat: 0.4,
  clearcoatRoughness: 0.35,
});
