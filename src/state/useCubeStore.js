import { create } from 'zustand';
import { createSolvedCube } from '../core/cube.js';
import { applyAlg, applyMove, invertMove } from '../core/moves.js';
import { randomScramble } from '../core/scramble.js';
import { createPainting, paintFacelet, paintingToCube } from '../core/paint.js';

/**
 * Cube state and the move queue.
 *
 * The queue is the whole timeline, past and future: `cursor` is how many of its
 * moves have been applied to `cube`. Stepping back applies an inverse and
 * decrements; stepping forward applies queue[cursor] and increments. One list,
 * no separate history to keep in sync.
 *
 * Speed lives in usePrefsStore, not here: it is a lasting preference rather
 * than part of this session's cube.
 *
 * `current` is the move being animated right now. It changes at most once per
 * move, never per frame — the animation's progress lives in a ref inside the
 * animator, so a turn costs zero React renders while it plays.
 *
 * @typedef {{ move: import('../core/moves.js').Move, direction: 1 | -1 }} Turn
 */

export const useCubeStore = create((set, get) => ({
  n: 3,
  cube: createSolvedCube(3),

  /**
   * The state the timeline starts from. Solved for free play; the case's setup
   * state when an algorithm is loaded from the library. Rewinding and scrubbing
   * both replay from here rather than assuming solved.
   */
  base: createSolvedCube(3),

  /** @type {import('../core/moves.js').Move[]} */
  queue: [],
  cursor: 0,

  /** @type {'idle' | 'playing' | 'paused'} */
  status: 'idle',

  /** @type {Turn | null} */
  current: null,

  /** True while a computed solution is playing itself out. */
  solving: false,

  /**
   * The painting in progress, or null when not in paint mode. While it is set
   * the cube on screen is the painting, not `cube`.
   */
  painting: null,

  /** The colour the brush is loaded with, and why the last click was refused. */
  paintColour: 'U',
  paintError: null,

  setSize(n) {
    const solved = createSolvedCube(n);
    set({
      n,
      cube: solved,
      base: solved,
      queue: [],
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
      painting: null,
    });
  },

  /** Replace the timeline, starting from `base` (solved unless given). */
  load(moves, base) {
    const start = base ?? createSolvedCube(get().n);
    set({
      base: start,
      cube: start,
      queue: moves,
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
      painting: null,
    });
  },

  /** Back to the start of the timeline, which it keeps. */
  rewind() {
    set({ cube: get().base, cursor: 0, current: null, status: 'idle' });
  },

  /** Back to solved with an empty timeline. */
  reset() {
    const solved = createSolvedCube(get().n);
    set({
      cube: solved,
      base: solved,
      queue: [],
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
      painting: null,
    });
  },

  /**
   * Free play, starting from a given cube — the one the user left behind, so
   * putting an algorithm away hands their own cube back rather than a solved
   * one. Falls back to solved when there is nothing remembered.
   */
  enterFreeplay(cube) {
    const start = cube ?? createSolvedCube(get().n);
    set({
      n: start.n,
      base: start,
      cube: start,
      queue: [],
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
      painting: null,
    });
  },

  /**
   * A free turn — a button press or a key.
   *
   * Deliberately does not touch the timeline: the loaded algorithm stays
   * exactly as it is so you can fiddle with the cube and still have the
   * algorithm to go back to. `direction: 0` is what tells finishTurn to move
   * the cube without moving the cursor. Rewind restores the case.
   */
  turn(move) {
    const { current } = get();
    if (current) return; // one turn at a time
    set({ status: 'paused', current: { move, direction: 0 } });
  },

  /**
   * Play a computed solution from where the cube is now.
   *
   * Loaded but not started: the solution is worth reading before watching, and
   * a cube jumping into motion the instant you ask for help is startling. Press
   * play or step through it.
   *
   * `solving` marks it as in flight, which is cleared once the last move lands.
   * The moves stay on the timeline afterwards so the solve can be rewound and
   * replayed, and `base` remains the scrambled cube it started from.
   */
  playSolution(moves) {
    if (moves.length === 0) return;
    const { cube } = get();
    set({
      base: cube,
      cube,
      queue: moves,
      cursor: 0,
      current: null,
      status: 'paused',
      solving: true,
    });
  },

  /**
   * Put the cube into a library case and load its algorithm ready to play.
   * The setup is the inverse of the algorithm, so playing it through lands on a
   * solved cube.
   */
  loadCase(setupMoves, algMoves, n = 3) {
    const start = applyAlg(createSolvedCube(n), setupMoves);
    set({
      n,
      base: start,
      cube: start,
      queue: algMoves,
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
      painting: null,
    });
  },

  /**
   * Drop into a scrambled cube with no algorithm loaded. The scramble is
   * applied at once rather than animated — it is a starting position, not
   * something to watch.
   */
  shuffle() {
    const { n } = get();
    const scrambled = applyAlg(createSolvedCube(n), randomScramble(n));
    set({
      base: scrambled,
      cube: scrambled,
      queue: [],
      cursor: 0,
      current: null,
      status: 'idle',
    });
  },

  /**
   * Start a turn driven by a finger rather than by the clock. The pivot is
   * handed to the gesture, which writes its rotation directly; the animator
   * stands down until the drag ends.
   */
  beginDrag(move) {
    if (get().current) return false;
    set({ status: 'paused', current: { move, direction: 0, dragging: true } });
    return true;
  },

  /**
   * Release a dragged turn. `amount` is the quarter turns it snapped to (0 to
   * spring back) and `fromAngle` where the finger left it, so the animator can
   * carry on from there rather than jumping.
   */
  endDrag(amount, fromAngle) {
    const { current } = get();
    if (!current?.dragging) return;
    set({
      current: {
        move: { ...current.move, amount, spin: amount },
        direction: 0,
        from: fromAngle,
      },
    });
  },

  cancelDrag() {
    if (get().current?.dragging) set({ current: null });
  },

  setPaintColour(paintColour) {
    set({ paintColour, paintError: null });
  },

  startPainting() {
    set({
      painting: createPainting(get().n),
      paintError: null,
      queue: [],
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
    });
  },

  cancelPainting() {
    set({ painting: null, paintError: null });
  },

  /**
   * Colour one sticker. Refused, with a reason, if it could not be part of a
   * real cube — see src/core/paint.js.
   */
  paintAt(key, colour = get().paintColour) {
    const { painting } = get();
    if (!painting) return { ok: false };
    const result = paintFacelet(painting, key, colour);
    set(
      result.ok ? { painting: result.painting, paintError: null } : { paintError: result.reason },
    );
    return result;
  },

  /** Take the finished painting as the cube. */
  applyPainting() {
    const { painting } = get();
    const cube = painting && paintingToCube(painting);
    if (!cube) return false;
    set({
      painting: null,
      n: cube.n,
      base: cube,
      cube,
      queue: [],
      cursor: 0,
      current: null,
      status: 'idle',
      solving: false,
    });
    return true;
  },

  play() {
    const { queue, cursor } = get();
    if (cursor >= queue.length) return;
    set({ status: 'playing' });
    if (!get().current) get().stepForward();
  },

  pause() {
    set({ status: 'paused' });
  },

  toggle() {
    const { status, queue, cursor } = get();
    if (status === 'playing') get().pause();
    else if (cursor < queue.length) get().play();
  },

  stepForward() {
    const { queue, cursor, current } = get();
    if (current || cursor >= queue.length) return;
    set({ current: { move: queue[cursor], direction: 1 } });
  },

  stepBack() {
    const { queue, cursor, current } = get();
    if (current || cursor === 0) return;
    set({ status: 'paused', current: { move: invertMove(queue[cursor - 1]), direction: -1 } });
  },

  /**
   * Called by the animator when a turn's animation reaches the end.
   *
   * This is the "bake to model" step: the logical cube advances, the animated
   * pivot empties, and every piece renders at exact lattice coordinates again.
   * Because the renderer never writes cubie transforms itself, there is no drift
   * to correct — the mesh is the model, by construction.
   */
  finishTurn() {
    const { cube, current, cursor, status, queue } = get();
    if (!current) return;

    const advanced = cursor + current.direction;
    set({
      cube: applyMove(cube, current.move),
      cursor: advanced,
      current: null,
    });

    // Only a forward step through the timeline chains into the next move; a
    // free turn stops where it is.
    if (status === 'playing' && current.direction === 1) {
      if (advanced < queue.length) {
        get().stepForward();
      } else {
        // A finished solution stays on the timeline so it can be rewound and
        // watched again; `base` is still the cube it started from, so going
        // back to the beginning returns to the scramble.
        set({ status: 'idle', solving: false });
      }
    }
  },

  /** Jump straight to a point on the timeline with no animation. */
  jumpTo(index) {
    const { queue, base } = get();
    const target = Math.min(Math.max(index, 0), queue.length);
    let cube = base;
    for (let i = 0; i < target; i++) cube = applyMove(cube, queue[i]);
    set({ cube, cursor: target, current: null, status: 'paused' });
  },
}));
