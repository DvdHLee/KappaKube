import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CubeMesh from './CubeMesh.jsx';
import TurnAnimator from './TurnAnimator.jsx';
import DragToTurn from './DragToTurn.jsx';
import PaintMesh from './PaintMesh.jsx';
import { useCubeStore } from '../state/useCubeStore.js';
import { FOV, ISO_DIRECTION, cameraDistance, cubeRadius, isoPosition } from './framing.js';

const ORIGIN = new THREE.Vector3(0, 0, 0);

/**
 * Eases the camera onto the iso preset, and gets out of the way otherwise.
 * A "free" request cancels an in-flight ease and leaves the camera put.
 */
function CameraRig({ view, n, aspect }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const goal = useRef(null);
  const framed = useRef(false);

  useEffect(() => {
    if (!view) return;
    goal.current = view.name === 'iso' ? isoPosition(n, aspect) : null;
  }, [view, n, aspect]);

  /**
   * Frame the cube once the real canvas size is known, and again if the aspect
   * changes — a phone rotating, or the browser chrome collapsing.
   *
   * The Canvas prop cannot do this: the camera is created before layout, so the
   * aspect is not known yet. Re-framing is skipped once the user has orbited
   * away, since then it would be yanking a camera they positioned themselves.
   */
  useEffect(() => {
    const onPreset =
      !framed.current || probeDir.copy(camera.position).normalize().dot(ISO_DIRECTION) > PRESET_DOT;
    framed.current = true;
    if (!onPreset) return;

    goal.current = null; // snap, do not animate a resize
    camera.position.copy(isoPosition(n, aspect));
    if (controls) controls.update();
  }, [aspect, n, camera, controls]);

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
 * Studio lighting built entirely from Lightformers inside a generated
 * environment map: soft reflections and no network fetch for an HDRI.
 * frames={1} bakes it once.
 *
 * Kept gentle on purpose. Strong key light plus a glossy surface produced a
 * bright sheen that lifted every face away from its palette colour; at these
 * levels the light shapes the cube without recolouring it.
 *
 * The ambient tone follows the theme, so the cube is lit by a room that matches
 * the page rather than carrying a dark surround onto a light one.
 */
function Studio({ theme }) {
  const ambient = theme === 'light' ? '#e6e6ee' : '#1a1a20';
  return (
    <Environment key={theme} resolution={256} frames={1}>
      <color attach="background" args={[ambient]} />
      {/* key: large softbox overhead */}
      <Lightformer form="rect" intensity={3.1} position={[0, 6, 1]} scale={[10, 10, 1]} />
      {/* fill: cool, front left */}
      <Lightformer
        form="rect"
        intensity={1.35}
        color="#dce7f5"
        position={[-6, 1, 5]}
        scale={[8, 8, 1]}
      />
      {/* rim: warm, behind right, separates the cube from the background */}
      <Lightformer
        form="rect"
        intensity={1.6}
        color="#f5e4d2"
        position={[6, 2, -6]}
        scale={[8, 8, 1]}
      />
      <Lightformer form="rect" intensity={0.7} position={[0, -5, 0]} scale={[8, 8, 1]} />
    </Environment>
  );
}

/** Reports the canvas aspect ratio out to the rig. */
function AspectProbe({ onChange }) {
  const size = useThree((s) => s.size);
  const aspect = size.height > 0 ? size.width / size.height : 1;
  useEffect(() => onChange(aspect), [aspect, onChange]);
  return null;
}

export default function Scene({ n, view, autoRotate, locked, theme, onActiveView }) {
  const radius = cubeRadius(n);
  const pivotRef = useRef(null);
  const [aspect, setAspect] = useState(1);
  const cube = useCubeStore((s) => s.cube);
  const current = useCubeStore((s) => s.current);
  const painting = useCubeStore((s) => s.painting);
  const paintAt = useCubeStore((s) => s.paintAt);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: FOV, near: 0.1, far: 200, position: isoPosition(n).toArray() }}
    >
      {/* No scene background: the canvas is left transparent so the stage's own
          backdrop runs unbroken behind the algorithm bar, the cube and the
          player, instead of the canvas painting a flat rectangle over it. */}

      <Studio theme={theme} />

      {painting ? (
        <PaintMesh painting={painting} onPaint={(key) => paintAt(key)} />
      ) : (
        <DragToTurn enabled={locked} pivotRef={pivotRef}>
          <CubeMesh cube={cube} current={current} pivotRef={pivotRef} />
        </DragToTurn>
      )}

      <TurnAnimator pivotRef={pivotRef} />

      <ContactShadows
        position={[0, -radius - 0.02, 0]}
        scale={radius * 6}
        blur={2.6}
        opacity={theme === 'light' ? 0.32 : 0.6}
        far={radius * 2}
        resolution={512}
        color={theme === 'light' ? '#2a2a3a' : '#000000'}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableRotate={!locked || Boolean(painting)}
        autoRotate={autoRotate && !locked && !painting}
        autoRotateSpeed={0.6}
        minDistance={cameraDistance(n, aspect, 0.55)}
        maxDistance={cameraDistance(n, aspect, 2.6)}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.15}
      />

      <AspectProbe onChange={setAspect} />
      <CameraRig view={view} n={n} aspect={aspect} />
      <ActiveViewProbe onChange={onActiveView} />
    </Canvas>
  );
}
