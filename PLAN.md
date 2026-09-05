# KappaKube — Implementation Plan

> A visual Rubik's Cube algorithm teacher. React + three.js, frontend-only, hosted on Vercel.
>
> **Status:** planning · **Drafted:** 2026-09-04

---

## 1. Stack decision

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 8** + React 19 | Vercel zero-config, instant HMR. Never CRA. |
| 3D | **three.js 0.185 + @react-three/fiber 9** | R3F is the only serious React↔three binding; it's a renderer, not a wrapper, so there's no perf tax and you can drop to raw three anywhere. |
| 3D helpers | **@react-three/drei 10** | `OrbitControls`, `RoundedBox`, `Environment`, `ContactShadows`, `CameraControls`, `Bounds`. Saves weeks. |
| Animation | **Hand-rolled in `useFrame`** (with `maath/easing` for damping) | See §3.3 — turn animation must be driven by a quaternion slerp on a pivot group, not by React state. A spring lib (`@react-spring/three`) fights the queue / step-through / scrub requirements. |
| State | **zustand 5** | Cube state must be readable inside `useFrame` without re-rendering. zustand's `getState()` / transient subscriptions are built for exactly this. Redux/Context would re-render the tree every move. |
| Scramble (later) | **`cubing`** (`randomScrambleForEvent`) | WCA-official random-*state* scrambles via WASM in a worker. Phase 6 upgrade — v1 uses random-move (see §6). |
| Solver (future) | **`cubing/search`** in a Web Worker | Same lib, `solve()` / min2phase. Already a dep by then. |
| Tests | **Vitest** | The cube math is pure JS and *must* be unit-tested; bugs there are invisible until an alg silently mis-renders. |

Versions verified against npm on 2026-09-04: `three@0.185.1`, `@react-three/fiber@9.7.0`
(peers: react `>=19 <19.3`, three `>=0.156`), `@react-three/drei@10.7.8`, `zustand@5.0.15`,
`vite@8.2.2`, `react@19.2.8`, `cubing@0.63.4`. Local toolchain: Node 24.18, npm 11.16.

### On JS vs TS

The project is specified as React JS, so the plan is JS. One caveat worth recording: the cube
model is dense index math (axes, layer depths, orientation matrices) where a typo compiles fine
and produces a subtly wrong cube. Recommended compromise — write `src/core/**` in TypeScript even
if the UI stays JS (Vite supports mixing per-file with zero config). If staying pure JS, use JSDoc
`@typedef` annotations in core so the editor still catches it. **Open decision.** Nothing else in
this plan is affected either way.

---

## 2. The core model (build this first, before any pixels)

Pure JS, **zero** three.js / React imports. This is the piece that makes 2x2 / 4x4 / NxN free later.

### 2.1 Representation

Source of truth is a **cubie list**, not a 54-sticker array:

```js
// N=3 → coords ∈ {-2, 0, 2};  N=4 → {-3,-1,1,3}.  Always integers: c_i = 2i-(N-1)
cubie = {
  id: 7,                        // stable identity, index into solved layout
  pos: [x, y, z],               // integer slot coords
  rot: [x, y, z, w]             // orientation quaternion, always one of the 24 cube rotations
}
cube = { n: 3, cubies: [...] }
```

Why cubie-level rather than facelets: it maps 1:1 onto the render (each cubie is one `<group>`),
generalises to any N with no new code, and makes a move a *pure rotation of a coordinate subset* —
no per-size permutation tables to hand-write and get wrong.

Facelets are **derived** on demand (§7), not stored.

### 2.2 Moves

```js
move = { axis: 'x'|'y'|'z', layers: [1, 2], amount: 1 }  // amount: 1=CW, -1=CCW, 2=180°
```

Applying a move = for each cubie whose coord on `axis` is in `layers`: rotate `pos` about the axis
and compose `rot`. Nine lines of code, size-agnostic.

**Sign convention to lock down on day one** (get this wrong and every algorithm is mirrored):
faces are *positions* — U is +Y, F is +Z, R is +X, regardless of which colour is painted there
(see §3.2). A clockwise turn *viewed from outside that face* is a **negative** right-hand rotation
about the positive axis for U/R/F, and a **positive** one for D/L/B. Encode this once in a table,
never inline.

### 2.3 Notation layer (`core/notation.js`)

Bidirectional. Parse → `move[]`, and `move[]` → canonical string.

- Faces `U D L R F B`, modifiers `'` and `2`
- Wide: `Rw`, `r`, and NxN prefix `3Rw`
- Slices `M E S`, rotations `x y z`
- Whitespace / comma tolerant; parentheses + repeat `(R U R' U')3` (also gives commutator /
  conjugate notation `[R, U]` cheaply later)
- Errors carry a character offset so the UI can underline bad input

**Tests that must pass before moving on:**

- `(R U R' U')` ×6 = identity
- T-perm `(R U R' U' R' F R2 U' R' U' R U R' F')` ×2 = identity
- `M` ≡ `R L' x'` equivalence
- `x y z` rotations leave the *solved* predicate true
- `parse(format(m)) === m` for all 18 basic moves

---

## 3. The 3D render (the priority)

### 3.1 Scene composition

```jsx
<Canvas shadows camera={{ position:[4.5,4,6], fov:38 }} dpr={[1,2]}
        gl={{ antialias:true }}>
  <color attach="background" ... />
  {/* key + fill + rim, no visible light sources */}
  <CubeMesh />                      {/* 26 cubie groups */}
  <ContactShadows blur={2.5} ... /> {/* soft grounding shadow, cheap */}
  <OrbitControls enableDamping enablePan={false}
                 minDistance={5} maxDistance={14} makeDefault />
  <Environment preset="city" background={false} /> {/* reflections only */}
</Canvas>
```

### 3.2 Minimalist cubie look

This is where "clean" is won or lost. The spec:

- **Stickerless, not stickered.** The piece is moulded in colour edge-to-edge; no black border
  frames a face. The only dark surfaces are the inward-facing sides glimpsed through the seams.
- **Body:** `RoundedBoxGeometry(0.98, segments 4, radius 0.09)`, `meshPhysicalMaterial` with
  `roughness 0.45 / metalness 0 / clearcoat 0.4`. The light clearcoat reads as glossy moulded
  plastic; the rounding plus a soft env map is what reads "premium" rather than "programmer cube".
- **How the colours get on:** `RoundedBoxGeometry` is non-indexed and inherits BoxGeometry's six
  material groups, and it only *spherifies* the original box vertices — so each group still covers
  one face plus its half of every adjacent bevel. Colouring per group therefore puts the colour
  break exactly on the 45° edge line, which is how a real moulded piece looks. Those groups are
  baked into a vertex-colour attribute and cleared: **one draw call per cubie** instead of six.
- **Geometry reuse:** a cubie's colour set never changes (turning only moves and reorients it), so
  each piece maps to one cached geometry for the life of the app, keyed by colour set. Bounded at
  **26 variants for any N** (6 single + 12 pairs + 8 triples) — 4x4's 56 pieces share those 26.
  Position/normal/uv attributes are shared with the base geometry, so they upload to the GPU once.
- **Palette:** desaturated and modern, not primary-crayon —
  `white #F2F2F0 · yellow #FFD52E · green #21B36B · blue #2D7FF9 · red #E63946 · orange #FF8A3D`.
  Default orientation is **white on D, red on F** (yellow U, orange B, green R, blue L) — valid WCA
  chirality and the CFOP-friendly start, with the cross colour down and the OLL/PLL face up.
  Colours and orientation live in one `theme.js`; face letters stay positions, not colours, so
  notation is unaffected by a remap.
- **No postprocessing in v1.** SSAO/bloom cost frames and the look doesn't need them. Revisit only
  if it feels flat.

### 3.3 Turn animation — the pivot-group technique

The single most important architectural detail for smoothness.

```
Idle:    scene → cubeRoot → [26 cubie groups]
Turning: scene → cubeRoot → pivot (empty Group) → [9 affected cubies]
                          → [17 untouched cubies]
```

1. **Begin:** pop the affected cubies out of `cubeRoot` and `attach()` them to a fresh `pivot`
   group (three's `attach` preserves world transform, so nothing visibly moves).
2. **Animate:** each frame in `useFrame`, set `pivot.quaternion` to `angle * easing(t)` about the
   axis. **No React state, no re-render** — one imperative quaternion write per frame.
3. **End:** apply the move to the logical cube model, `attach()` the cubies back to `cubeRoot`,
   then **snap** each cubie's position and quaternion to the exact lattice values from the model.
   This "bake to model" step is what prevents float drift over thousands of moves.

Easing: `easeOutCubic`-ish, or overshoot-free `easeInOutQuad` for algorithm playback. For a chained
sequence, allow the next move to begin at ~85% of the previous one (configurable "flow") — this is
what makes alg playback look like a human rather than a metronome.

**Non-negotiable perf rules:**

- Zero allocations in `useFrame` — pre-allocate `Quaternion` / `Vector3` scratch objects at module
  scope.
- Cube model lives in zustand; the renderer reads it with `useStore.getState()` inside the frame
  loop and subscribes transiently, never via a hook that re-renders.
- `dpr={[1,2]}` caps retina cost; `frameloop="demand"` + `invalidate()` while animating or orbiting
  keeps the GPU idle at rest (drei's `OrbitControls` already calls `invalidate`).
- Target 60fps on integrated graphics; verify with `r3f-perf` during Phase 3, then remove it.

### 3.4 Camera

- `OrbitControls` with damping, pan disabled, polar angle clamped to avoid gimbal-flip at the poles.
- Preset buttons (Front / Back / Top-corner / Reset) animating via drei
  `CameraControls.setLookAt(..., true)`.
- Auto-rotate toggle for an idle "hero" state.
- Cube rotations `x/y/z` rotate the *cube model*, not the camera — keep those strictly distinct.

---

## 4. Move queue & playback engine

A small state machine in zustand, independent of the renderer:

```
status:  'idle' | 'playing' | 'paused' | 'stepping'
queue:   Move[]        cursor: number
speed:   ms per quarter-turn (slider 80–1200, default ~280)
history: Move[]        // enables undo + full sequence notation
```

API: `enqueue(alg)`, `play()`, `pause()`, `stepForward()`, `stepBack()` (applies the inverse),
`jumpTo(i)` (instant, no animation), `reset()`, `setSpeed()`.

Step-back applies the inverse move — so a full inverse-alg implementation in core gives scrubbing
for free. `jumpTo` replays from the anchor state without animation, which is how the timeline
scrubber works in Phase 4.

Input surfaces feeding the queue: on-screen notation buttons, a text field (`R U R' U'` → parse →
enqueue), keyboard bindings (speedcuber-standard: `j`=U, `f`=U', `i`=R, `k`=R'…), and later
drag-to-turn.

---

## 5. Algorithm library

Static JSON in-repo (no runtime fetch, no external API):

```js
{ id:"OLL-21", group:"OLL", name:"H / Double Cross", probability:"1/54",
  algs:[ {alg:"R U2 R' U' R U R' U' R U' R'", note:"most common"},
         {alg:"F (R U R' U')3 F'",            note:"finger-friendly"} ],
  pattern: [...],        // 3x3 top face + side stickers → drives the 2D diagram
  setup: "R U2 R' U' R U R' U' R U' R'"   // usually the inverse
}
```

57 OLL + 21 PLL. The `pattern` field drives a small **SVG 2D case diagram** component (the standard
yellow-top view with side bars) — that's the recognition-training half of the app and it's ~80
lines of SVG. Cases are also renderable on the 3D cube by applying `setup` from solved.

Algorithms curated from the standard community sets (algdb / SpeedCubeDB conventions) and
**validated programmatically in a test**: apply setup then alg to a solved cube and assert the
expected OLL/PLL state. No hand-checking 200 algorithms.

---

## 6. Scramble

- **v1:** random-move — 25 moves, no same-face repeats, no redundant opposite-face pairs.
  Guaranteed reachable by construction, zero deps, instant. Satisfies "must be a possible state".
- **v2 (Phase 6):** `cubing`'s `randomScrambleForEvent("333")` in a Web Worker for true WCA
  random-state scrambles (uniform over all 4.3×10¹⁹ states, ~20 moves). Loaded lazily so the WASM
  never touches first paint.

---

## 7. State notation

"Conventionally notate any cube state" has two readings; build both:

1. **Facelet notation** (the standard reading) — derive the 54-sticker string in Kociemba order
   `U R F D L B`, row-major per face: `UUUUUUUUURRRRRRRRR…`. Plus a `parseFacelets()` inverse with
   full validity checking (colour counts, corner/edge orientation, permutation parity) so a pasted
   state can't be impossible. This also gives shareable URLs and is exactly the input format the
   solver wants.
2. **Move notation** — the canonical move-sequence string from history, and later (with the solver)
   the shortest sequence reaching a given state.

---

## 8. Structure

```
src/
  core/                 # pure, no React, no three — 100% unit tested
    cube.js  moves.js  notation.js  facelets.js  scramble.js  validate.js
  three/
    CubeMesh.jsx  Cubie.jsx  StickerGeometry.js  TurnAnimator.js  Scene.jsx
  state/
    useCubeStore.js  usePlayerStore.js  useSettingsStore.js
  data/
    oll.json  pll.json
  ui/
    Controls/  AlgPlayer/  AlgBrowser/  CaseDiagram.jsx  NotationInput.jsx
  App.jsx
```

The hard boundary between `core/` and `three/` is what buys 2x2 / 4x4 later and makes the solver a
drop-in.

---

## 9. Phases

| # | Deliverable | Exit criteria |
|---|---|---|
| **0** | Vite scaffold, deps, ESLint/Prettier, Vercel deploy | blank canvas live on a URL |
| **1** | `core/` model + notation + tests | the §2.3 identity tests pass |
| **2** | **Static 3D cube, final look, orbit camera** | looks *right* at rest — this is the gate |
| **3** | **Turn animation + queue** | 60fps through `(R U R' U')` ×20, model & mesh still exactly in sync |
| **4** | Player UI: play/pause/step/speed/scrub, notation input, keyboard | paste any alg, watch it, step through it |
| **5** | OLL/PLL library + 2D case diagrams + browser | all 78 cases validated in CI |
| **6** | Scramble (random-move → random-state) | scrambles are always solvable |
| **7** | Facelet notation, import/export, URL state sharing | round-trip fidelity test |
| **8** | *Future:* solver in worker; 2x2/4x4/5x5; drag-to-turn; trainer mode with timer | — |

Phases 2 and 3 carry the risk. If the cube doesn't look and feel right there, nothing after it
matters — so those should reach a polished state and get a visual review before any UI chrome
is built.

---

## 10. Open decisions

- [ ] TypeScript for `src/core/**`, or pure JS with JSDoc types? (§1)
- [ ] Start with Phase 0+1 (scaffold + tested cube model), or a Phase 2 visual spike first?
