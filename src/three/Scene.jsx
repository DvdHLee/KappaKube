import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CubeMesh from './CubeMesh.jsx';
import TurnAnimator from './TurnAnimator.jsx';
import { useCubeStore } from '../state/useCubeStore.js';
import { BACKGROUND_COLOR } from '../theme.js';
import { FOV, ISO_DIRECTION, cameraDistance, cubeRadius, isoPosition } from './framing.js';

const ORIGIN = new THREE.Vector3(0, 0, 0);

/**
 * Eases the camera onto the iso preset, and gets out of the way otherwise.
 * A "free" request cancels an in-flight ease and leaves the camera put.
 */
function CameraRig({ view, n }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const goal = useRef(null);

  useEffect(() => {
    if (!view) return;
    goal.current = view.name === 'iso' ? isoPosition(n) : null;
  }, [view, n]);

  useFrame((_, dt) => {
    if (!goal.current || !controls) return;
    const k = 1 - Math.pow(0.0015, Math.min(dt, 0.1)); // frame-rate independent easing
    camera.position.lerp(goal.current, k);
    controls.target.lerp(ORIGIN, k);
    controls.update();
    if (camera.position.distanceTo(goal.current) < 0.005) goal.current = null;
  });

  return null;
}

const probeDir = new THREE.Vector3();
// ~1.8 degrees. Tight enough that any deliberate orbit reads as free.
const PRESET_DOT = 0.9995;

/**
 * Reports whether the camera is sitting on the iso preset or has been orbited
 * off it. Driven by actual camera direction rather than the last button
 * pressed, so the highlight can never go stale.
 */
function ActiveViewProbe({ onChange }) {
  const camera = useThree((s) => s.camera);
  const last = useRef(undefined);

  useFrame(() => {
    probeDir.copy(camera.position).normalize();
    const match = probeDir.dot(ISO_DIRECTION) > PRESET_DOT ? 'iso' : 'free';

    if (match !== last.current) {
      last.current = match;
      onChange(match);
    }
  });

  return null;
}

/**
 * Studio lighting built entirely from Lightformers inside a generated environment
 * map: soft reflections and no network fetch for an HDRI. frames={1} bakes it once.
 */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#111114']} />
      {/* key: large softbox overhead */}
      <Lightformer form="rect" intensity={5} position={[0, 6, 1]} scale={[10, 10, 1]} />
      {/* fill: cool, front left */}
      <Lightformer
        form="rect"
        intensity={2}
        color="#cfe4ff"
        position={[-6, 1, 5]}
        scale={[8, 8, 1]}
      />
      {/* rim: warm, behind right, separates the cube from the background */}
      <Lightformer
        form="rect"
        intensity={3}
        color="#ffd9b8"
        position={[6, 2, -6]}
        scale={[8, 8, 1]}
      />
      <Lightformer form="rect" intensity={1} position={[0, -5, 0]} scale={[8, 8, 1]} />
    </Environment>
  );
}

export default function Scene({ n, view, autoRotate, onActiveView }) {
  const radius = cubeRadius(n);
  const pivotRef = useRef(null);
  const cube = useCubeStore((s) => s.cube);
  const current = useCubeStore((s) => s.current);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: FOV, near: 0.1, far: 200, position: isoPosition(n).toArray() }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />

      <Studio />

      <CubeMesh cube={cube} current={current} pivotRef={pivotRef} />

      <TurnAnimator pivotRef={pivotRef} />

      <ContactShadows
        position={[0, -radius - 0.02, 0]}
        scale={radius * 6}
        blur={2.6}
        opacity={0.6}
        far={radius * 2}
        resolution={512}
        color="#000000"
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        minDistance={cameraDistance(n, 0.8)}
        maxDistance={cameraDistance(n, 3.5)}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.15}
      />

      <CameraRig view={view} n={n} />
      <ActiveViewProbe onChange={onActiveView} />
    </Canvas>
  );
}
