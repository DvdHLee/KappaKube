import { useMemo } from 'react';
import * as THREE from 'three';
import { createSolvedCube, latticeToWorld } from '../core/cube.js';
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
 * One <group> per cubie, holding a single stickerless mesh.
 *
 * The group wrapper is deliberate: in Phase 3 a turn reparents the affected
 * groups under a pivot and rotates the pivot, so nothing in here changes when
 * animation lands.
 */
function Cubie({ pos, rot, stickers }) {
  const [x, y, z] = latticeToWorld(pos, SPACING);

  return (
    <group position={[x, y, z]} quaternion={quaternionFromMat3(rot)}>
      <mesh geometry={cubieGeometryFor(stickers)} material={cubieMaterial} />
    </group>
  );
}

/**
 * Renders any cube state. Falls back to solved when no state is supplied, which
 * is all Phase 2 needs.
 */
export default function CubeMesh({ n = 3, cube }) {
  const solved = useMemo(() => createSolvedCube(n), [n]);
  const model = cube ?? solved;

  return (
    <group>
      {model.cubies.map((c) => (
        <Cubie key={c.id} pos={c.pos} rot={c.rot} stickers={c.stickers} />
      ))}
    </group>
  );
}
