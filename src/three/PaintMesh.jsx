import { useMemo } from 'react';
import * as THREE from 'three';
import { createSolvedCube, latticeToWorld } from '../core/cube.js';
import { faceletKey } from '../core/paint.js';
import { SPACING } from '../theme.js';
import { cubieMaterial, paintedCubieGeometry } from './geometry.js';

/**
 * The cube while it is being painted: a still shell in the solved layout, with
 * every sticker showing whatever colour has been given to it and grey where
 * none has.
 *
 * Deliberately not the live cube. A painting describes what the faces look
 * like, and nothing is known about where the pieces are until enough has been
 * filled in to work it out — so there is nothing to animate and no state to
 * show beyond the stickers themselves.
 */

const scratch = new THREE.Vector3();
const normalMatrix = new THREE.Matrix3();

/** Nearest axis, since the rounded bevel gives an in-between normal at an edge. */
function faceFromNormal(v) {
  const abs = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  const axis = abs.indexOf(Math.max(...abs));
  const sign = Math.sign(v.getComponent(axis)) || 1;
  return [sign > 0 ? 'R' : 'L', sign > 0 ? 'U' : 'D', sign > 0 ? 'F' : 'B'][axis];
}

export default function PaintMesh({ painting, onPaint }) {
  const shell = useMemo(() => createSolvedCube(painting.n), [painting.n]);

  const handlePointerDown = (event) => {
    const pos = event.object?.userData?.pos;
    if (!pos || !event.face) return;
    event.stopPropagation();

    const worldNormal = scratch
      .copy(event.face.normal)
      .applyNormalMatrix(normalMatrix.getNormalMatrix(event.object.matrixWorld))
      .normalize();

    onPaint(faceletKey(pos, faceFromNormal(worldNormal)));
  };

  return (
    <group onPointerDown={handlePointerDown}>
      {shell.cubies.map((cubie) => {
        const [x, y, z] = latticeToWorld(cubie.pos, SPACING);
        const sides = {};
        for (const face of Object.keys(cubie.stickers)) {
          sides[face] = painting.colours[faceletKey(cubie.pos, face)] ?? null;
        }
        return (
          <mesh
            key={cubie.id}
            position={[x, y, z]}
            geometry={paintedCubieGeometry(sides)}
            material={cubieMaterial}
            dispose={null}
            userData={{ pos: cubie.pos }}
          />
        );
      })}
    </group>
  );
}
