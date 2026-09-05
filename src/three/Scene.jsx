import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CubeMesh from './CubeMesh.jsx';
import { BACKGROUND_COLOR, CUBIE_SIZE, SPACING } from '../theme.js';

/** Half the cube's extent in world units — used to place the ground shadow. */
export function cubeRadius(n) {
  return ((n - 1) / 2) * SPACING + CUBIE_SIZE / 2;
}

export const FOV = 35;

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

const ISO_DIRECTION = (() => {
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

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: FOV, near: 0.1, far: 200, position: isoPosition(n).toArray() }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />

      <Studio />

      <CubeMesh n={n} />

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
