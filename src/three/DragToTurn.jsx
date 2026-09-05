import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AXIS_INDEX } from '../core/cube.js';
import { useCubeStore } from '../state/useCubeStore.js';

/**
 * Turn a layer by dragging it, the way you would move a real cube.
 *
 * Grab a sticker and the outward normal of the face you grabbed, together with
 * the direction you drag, name the turn: the layer spins about `normal x drag`,
 * and the piece under your finger travels the way your finger does. That single
 * cross product covers all 24 combinations of face and direction, so there is
 * no table of special cases to get wrong.
 *
 * The turn follows the finger continuously and snaps to the nearest quarter on
 * release, easing on from wherever it was let go rather than jumping.
 */

const AXES = ['x', 'y', 'z'];
const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/** Ignore the first few pixels so a tap does not become a turn. */
const DEADZONE_PX = 7;

/** Fraction of the smaller viewport edge that equals a quarter turn. */
const QUARTER_TURN_FRACTION = 0.32;

const scratchNormal = new THREE.Matrix3();
const scratchVec = new THREE.Vector3();
const projectedFrom = new THREE.Vector3();
const projectedTo = new THREE.Vector3();

/** Nearest axis direction, since a bevelled edge gives an in-between normal. */
function snapToAxis(v) {
  const abs = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  const axis = abs.indexOf(Math.max(...abs));
  const out = [0, 0, 0];
  out[axis] = Math.sign(v.getComponent(axis)) || 1;
  return out;
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Where a world-space direction points on screen, as a unit 2D vector. */
function screenDirection(origin, direction, camera, width, height) {
  projectedFrom.copy(origin).project(camera);
  projectedTo.copy(origin).addScaledVector(direction, 0.15).project(camera);

  const x = ((projectedTo.x - projectedFrom.x) * width) / 2;
  const y = (-(projectedTo.y - projectedFrom.y) * height) / 2;
  const length = Math.hypot(x, y);
  return length < 1e-6 ? null : { x: x / length, y: y / length };
}

export default function DragToTurn({ enabled, pivotRef, children }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const drag = useRef(null);

  const onPointerDown = (event) => {
    if (!enabled || drag.current) return;
    if (useCubeStore.getState().current) return; // a turn is already running
    const grabbed = event.object?.userData?.pos;
    if (!grabbed || !event.face) return;

    event.stopPropagation();

    const worldNormal = scratchVec
      .copy(event.face.normal)
      .applyNormalMatrix(scratchNormal.getNormalMatrix(event.object.matrixWorld))
      .normalize();

    drag.current = {
      pointerId: event.pointerId,
      pos: grabbed,
      normal: snapToAxis(worldNormal),
      point: event.point.clone(),
      startX: event.clientX,
      startY: event.clientY,
      turn: null,
      angle: 0,
    };

    gl.domElement.setPointerCapture?.(event.pointerId);
  };

  /**
   * Once the drag clears the deadzone, decide which turn it is: of the four
   * directions lying in the grabbed face, take whichever points most nearly
   * along the drag on screen.
   */
  const resolveTurn = (state, dx, dy) => {
    const length = Math.hypot(dx, dy);
    const drift = { x: dx / length, y: dy / length };

    let best = null;
    for (const axis of AXES) {
      if (state.normal[AXIS_INDEX[axis]] !== 0) continue; // in the face, not through it
      for (const sign of [1, -1]) {
        const direction = scratchVec.copy(AXIS_VECTORS[axis]).multiplyScalar(sign);
        const onScreen = screenDirection(state.point, direction, camera, size.width, size.height);
        if (!onScreen) continue;

        const alignment = onScreen.x * drift.x + onScreen.y * drift.y;
        if (!best || alignment > best.alignment) {
          const world = [0, 0, 0];
          world[AXIS_INDEX[axis]] = sign;
          best = { alignment, world, onScreen };
        }
      }
    }
    if (!best) return null;

    // normal x drag names the axis; its sign is the turn direction.
    const spin = cross(state.normal, best.world);
    const index = spin.findIndex((v) => v !== 0);
    if (index < 0) return null;

    const axis = AXES[index];
    return {
      move: { axis, layers: [state.pos[index]], amount: spin[index], spin: spin[index] },
      sign: spin[index],
      screenDir: best.onScreen,
    };
  };

  useEffect(() => {
    if (!enabled) return undefined;

    const perQuarter = Math.min(size.width, size.height) * QUARTER_TURN_FRACTION;

    const onMove = (event) => {
      const state = drag.current;
      if (!state || event.pointerId !== state.pointerId) return;

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;

      if (!state.turn) {
        if (Math.hypot(dx, dy) < DEADZONE_PX) return;
        const turn = resolveTurn(state, dx, dy);
        if (!turn) {
          drag.current = null;
          return;
        }
        if (!useCubeStore.getState().beginDrag(turn.move)) {
          drag.current = null;
          return;
        }
        state.turn = turn;
      }

      const along = dx * state.turn.screenDir.x + dy * state.turn.screenDir.y;
      state.angle = state.turn.sign * (along / perQuarter) * (Math.PI / 2);

      const pivot = pivotRef.current;
      if (pivot) pivot.quaternion.setFromAxisAngle(AXIS_VECTORS[state.turn.move.axis], state.angle);
    };

    const onUp = (event) => {
      const state = drag.current;
      if (!state || event.pointerId !== state.pointerId) return;
      drag.current = null;
      gl.domElement.releasePointerCapture?.(event.pointerId);
      if (!state.turn) return;

      // Snap to the nearest quarter; a half turn is as far as one drag goes.
      const quarters = Math.round(state.angle / (Math.PI / 2));
      const clamped = Math.max(-2, Math.min(2, quarters));
      useCubeStore.getState().endDrag(clamped, state.angle);
    };

    const onCancel = () => {
      if (!drag.current) return;
      drag.current = null;
      useCubeStore.getState().cancelDrag();
    };

    const target = gl.domElement;
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    return () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
    };
  });

  // Cancel anything in flight when the lock is switched off mid-drag.
  useEffect(() => {
    if (enabled) return;
    drag.current = null;
    useCubeStore.getState().cancelDrag();
  }, [enabled]);

  return <group onPointerDown={onPointerDown}>{children}</group>;
}
