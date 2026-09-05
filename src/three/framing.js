import * as THREE from 'three';
import { CUBIE_SIZE, SPACING } from '../theme.js';

/**
 * Camera framing maths, kept out of Scene.jsx so that file exports only
 * components (which is what keeps fast refresh working).
 */

export const FOV = 35;

/** Half the cube's extent in world units — used to place the ground shadow. */
export function cubeRadius(n) {
  return ((n - 1) / 2) * SPACING + CUBIE_SIZE / 2;
}

/**
 * Camera distance that frames a cube of size n with the given margin.
 *
 * Measured against the cube's bounding *sphere* (corner-to-corner), which
 * projects to the same radius from every angle — so the framing holds at any
 * orbit position and nothing ever clips. margin 1 exactly fills the frame
 * height; the default leaves the cube sitting comfortably inside it.
 */
export function cameraDistance(n, margin = 1.4) {
  const boundingRadius = cubeRadius(n) * Math.sqrt(3);
  return (boundingRadius * margin) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
}

/**
 * The one camera preset, as angles rather than raw components so it can be
 * tuned by eye. Azimuth swings from straight-on (+Z) toward the right face;
 * a true corner view would be 45 degrees, so this sits deliberately short of
 * that and reads as a front view with depth rather than a diagonal.
 */
const ISO_AZIMUTH_DEG = 25;
const ISO_ELEVATION_DEG = 22;

export const ISO_DIRECTION = (() => {
  const az = THREE.MathUtils.degToRad(ISO_AZIMUTH_DEG);
  const el = THREE.MathUtils.degToRad(ISO_ELEVATION_DEG);
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  ).normalize();
})();

/** Camera position for the iso preset. Single source of truth for both the
 *  initial camera and the rig, so the starting view registers as the preset. */
export function isoPosition(n) {
  return ISO_DIRECTION.clone().multiplyScalar(cameraDistance(n));
}
