import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCubeStore } from '../state/useCubeStore.js';

/**
 * Drives the turning pivot.
 *
 * Everything here is deliberately allocation-free and render-free: the axis
 * vectors are module-level singletons, the progress lives in a ref, and the
 * only React state change in a whole turn is the one at the end. A turn
 * therefore costs one quaternion write per frame and nothing else.
 */

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/** Smooth at both ends. A turn that starts and stops abruptly reads as a glitch. */
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * How long a turn should take, in **seconds** (useFrame's delta is in seconds,
 * while `speed` is authored in ms because that is what reads well in a UI).
 *
 * A half turn covers twice the angle but should not take twice as long — at
 * equal angular speed it feels sluggish next to the quarter turns around it.
 */
function durationFor(move, speedMs) {
  const ms = Math.abs(move.amount) === 2 ? speedMs * 1.6 : speedMs;
  return ms / 1000;
}

/**
 * Quarter turns to animate, as a signed rotation about the positive axis.
 *
 * Prefers the parser's `spin` hint, which preserves the direction of a half
 * turn that `amount` folds away. Falls back to `amount` for moves built in code.
 */
function spinOf(move) {
  return move.spin ?? move.amount;
}

export default function TurnAnimator({ pivotRef }) {
  const progress = useRef(null);

  useFrame((_, delta) => {
    const pivot = pivotRef.current;
    if (!pivot) return;

    const { current, speed, finishTurn } = useCubeStore.getState();

    if (!current) {
      if (progress.current) {
        progress.current = null;
        pivot.quaternion.identity();
      }
      return;
    }

    // While a finger is on the cube the gesture owns the pivot.
    if (current.dragging) {
      progress.current = null;
      return;
    }

    // A new turn. It may start part-way round, when a drag has just been let
    // go — carrying on from where the finger left it instead of snapping back
    // to zero and replaying is what makes the release feel continuous.
    if (progress.current?.turn !== current) {
      const from = current.from ?? 0;
      const to = spinOf(current.move) * (Math.PI / 2);
      const full = durationFor(current.move, speed);
      const span = Math.abs(to - from);
      const whole = Math.abs(to) || Math.PI / 2;

      progress.current = {
        turn: current,
        elapsed: 0,
        // Only the remaining sweep is left to cover, so scale the time to match.
        duration: Math.max(0.05, full * (span / whole)),
        from,
        to,
      };
    }

    const p = progress.current;
    // Clamp delta so a stall (tab in the background, a long GC) does not make a
    // turn jump most of the way through in a single frame.
    p.elapsed += Math.min(delta, 0.1);

    const t = Math.min(p.elapsed / p.duration, 1);
    const angle = p.from + (p.to - p.from) * easeInOutQuad(t);
    pivot.quaternion.setFromAxisAngle(AXIS_VECTORS[current.move.axis], angle);

    if (t >= 1) {
      progress.current = null;
      finishTurn();
    }
  });

  return null;
}
