import { useMemo } from 'react';
import * as THREE from 'three';
import { AXIS_INDEX, latticeToWorld } from '../core/cube.js';
import { SPACING } from '../theme.js';
import { cubieGeometryFor, cubieMaterial } from './geometry.js';

/**
 * The core model stores orientation as an integer matrix (exact, no drift); the
 * renderer wants a quaternion. This is the single conversion point between them.
 */
const scratchMatrix = new THREE.Matrix4();
function quaternionFromMat3(rot) {
  // prettier-ignore
  scratchMatrix.set(
    rot[0], rot[1], rot[2], 0,
    rot[3], rot[4], rot[5], 0,
    rot[6], rot[7], rot[8], 0,
    0,      0,      0,      1,
  );
  return new THREE.Quaternion().setFromRotationMatrix(scratchMatrix);
}

/**
 * One <group> per cubie.
 *
 * `dispose={null}` matters: geometries and materials here are module-level
 * singletons shared by every cubie and cached across the app's lifetime, and
 * pieces unmount and remount as they move in and out of the turning pivot. Left
 * to its default, R3F would dispose those shared GPU resources on unmount.
 */
function Cubie({ pos, rot, stickers }) {
  const [x, y, z] = latticeToWorld(pos, SPACING);

  return (
    <group position={[x, y, z]} quaternion={quaternionFromMat3(rot)}>
      <mesh geometry={cubieGeometryFor(stickers)} material={cubieMaterial} dispose={null} />
    </group>
  );
}

/**
 * Renders a cube state, with the pieces of any in-flight turn parented under a
 * pivot group that the animator rotates.
 *
 * The split is declarative — React owns the scene graph, so there is no
 * imperative `attach()` to fight the reconciler — and it changes only at move
 * boundaries, not per frame.
 *
 * Crucially, cubie transforms always come straight from the model. The animator
 * writes only the pivot's rotation, never a piece's own position or orientation,
 * so the mesh cannot drift out of sync with the model: there is nothing to
 * re-sync, because nothing was ever overwritten.
 */
export default function CubeMesh({ cube, current, pivotRef }) {
  const { stationary, turning } = useMemo(() => {
    if (!current) return { stationary: cube.cubies, turning: [] };

    const axisIndex = AXIS_INDEX[current.move.axis];
    const layers = new Set(current.move.layers);
    const stationary = [];
    const turning = [];
    for (const cubie of cube.cubies) {
      (layers.has(cubie.pos[axisIndex]) ? turning : stationary).push(cubie);
    }
    return { stationary, turning };
  }, [cube, current]);

  return (
    <group>
      {stationary.map((c) => (
        <Cubie key={c.id} pos={c.pos} rot={c.rot} stickers={c.stickers} />
      ))}

      <group ref={pivotRef}>
        {turning.map((c) => (
          <Cubie key={c.id} pos={c.pos} rot={c.rot} stickers={c.stickers} />
        ))}
      </group>
    </group>
  );
}
