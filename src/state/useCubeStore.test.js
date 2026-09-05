import { beforeEach, describe, expect, it } from 'vitest';
import { createSolvedCube, cubesEqual, sameVisibleState } from '../core/cube.js';
import { applyAlg, invertAlg } from '../core/moves.js';
import { parseAlg } from '../core/notation.js';
import { useCubeStore } from './useCubeStore.js';

const store = () => useCubeStore.getState();

/**
 * The animator normally drives this: it sets `current`, animates for a while,
 * then calls finishTurn. Headlessly we can just skip the animating part, which
 * is exactly what makes the queue logic testable without a render loop.
 */
function settle(limit = 500) {
  let guard = 0;
  while (store().current && guard++ < limit) store().finishTurn();
  if (guard >= limit) throw new Error('turns never settled');
}

function playAll() {
  store().play();
  settle();
}

beforeEach(() => {
  store().setSize(3);
});

describe('loading', () => {
  it('starts solved with an empty timeline', () => {
    expect(store().queue).toEqual([]);
    expect(store().cursor).toBe(0);
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(true);
  });

  it('load replaces the timeline and returns to solved', () => {
    const alg = parseAlg("R U R' U'");
    store().load(alg);
    expect(store().queue).toHaveLength(4);
    expect(store().cursor).toBe(0);
    expect(store().status).toBe('idle');
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(true);
  });
});

describe('playback', () => {
  it('playing the queue matches applying the algorithm directly', () => {
    const alg = parseAlg("R U R' U' R' F R2 U' R' U' R U R' F'");
    store().load(alg);
    playAll();

    expect(store().cursor).toBe(alg.length);
    expect(store().status).toBe('idle');
    expect(cubesEqual(store().cube, applyAlg(createSolvedCube(3), alg))).toBe(true);
  });

  it('stops at the end rather than running off it', () => {
    store().load(parseAlg('R U'));
    playAll();
    expect(store().cursor).toBe(2);
    store().play();
    expect(store().current).toBeNull();
  });

  it("the exit criterion: (R U R' U') x20 lands back on solved", () => {
    // 6 repetitions is the identity, so 20 leaves the cube two short of it —
    // the point is that 80 animated turns stay exactly in step with the model.
    const alg = parseAlg("(R U R' U')20");
    store().load(alg);
    playAll();
    expect(store().cursor).toBe(80);
    expect(cubesEqual(store().cube, applyAlg(createSolvedCube(3), alg))).toBe(true);

    store().load(parseAlg("(R U R' U')24"));
    playAll();
    expect(sameVisibleState(store().cube, createSolvedCube(3))).toBe(true);
  });

  it('pause stops the chain after the turn in flight', () => {
    store().load(parseAlg('R U F D'));
    store().play();
    store().pause();
    settle();
    expect(store().cursor).toBe(1); // the in-flight turn completed, no more started
    expect(store().status).toBe('paused');
  });
});

describe('stepping', () => {
  it('steps forward one move at a time', () => {
    store().load(parseAlg("R U R'"));
    store().stepForward();
    settle();
    expect(store().cursor).toBe(1);
    expect(cubesEqual(store().cube, applyAlg(createSolvedCube(3), parseAlg('R')))).toBe(true);
  });

  it('steps back by applying the inverse', () => {
    const alg = parseAlg("R U R' U'");
    store().load(alg);
    playAll();

    for (let i = 4; i > 0; i--) {
      store().stepBack();
      settle();
      expect(store().cursor).toBe(i - 1);
    }
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(true);
  });

  it('stepping back and forward again returns the same state', () => {
    store().load(parseAlg("R U R' U' F"));
    playAll();
    const before = store().cube;

    store().stepBack();
    settle();
    store().stepForward();
    settle();

    expect(cubesEqual(store().cube, before)).toBe(true);
    expect(store().cursor).toBe(5);
  });

  it('will not step past either end', () => {
    store().load(parseAlg('R'));
    store().stepBack();
    expect(store().current).toBeNull();
    playAll();
    store().stepForward();
    expect(store().current).toBeNull();
  });
});

describe('free turns', () => {
  it('moves the cube without touching the timeline', () => {
    const [move] = parseAlg('R');
    store().turn(move);
    settle();

    expect(store().queue).toEqual([]); // nothing recorded
    expect(store().cursor).toBe(0);
    expect(cubesEqual(store().cube, applyAlg(createSolvedCube(3), parseAlg('R')))).toBe(true);
  });

  it('leaves a loaded algorithm intact', () => {
    store().load(parseAlg('R U F'));
    store().stepForward();
    settle(); // one move in

    const [move] = parseAlg('D');
    store().turn(move);
    settle();

    expect(store().queue).toHaveLength(3); // algorithm untouched
    expect(store().cursor).toBe(1); // and still one move in
    expect(cubesEqual(store().cube, applyAlg(createSolvedCube(3), parseAlg('R D')))).toBe(true);
  });

  it('rewind puts the case back after free turns', () => {
    store().load(parseAlg('R U F'));
    const start = store().cube;
    store().turn(parseAlg('D')[0]);
    settle();
    store().rewind();
    expect(cubesEqual(store().cube, start)).toBe(true);
  });

  it('does not chain into the algorithm while it is playing', () => {
    store().load(parseAlg('R U F D'));
    store().turn(parseAlg('L')[0]);
    settle();
    expect(store().status).toBe('paused');
    expect(store().cursor).toBe(0);
  });

  it('refuses a second turn while one is in flight', () => {
    store().turn(parseAlg('R')[0]);
    expect(store().current).not.toBeNull();
    const inFlight = store().current;
    store().turn(parseAlg('U')[0]); // ignored
    expect(store().current).toBe(inFlight);
  });
});

describe('shuffle', () => {
  it('scrambles the cube and clears the timeline', () => {
    store().load(parseAlg("R U R' U'"));
    store().shuffle();

    expect(store().queue).toEqual([]);
    expect(store().cursor).toBe(0);
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(false);
    // The scramble becomes the new starting point, so rewind returns to it.
    const scrambled = store().cube;
    store().turn(parseAlg('R')[0]);
    settle();
    store().rewind();
    expect(cubesEqual(store().cube, scrambled)).toBe(true);
  });

  it('works at every size the app offers', () => {
    for (const n of [2, 3]) {
      store().setSize(n);
      store().shuffle();
      expect(store().cube.n).toBe(n);
      expect(cubesEqual(store().cube, createSolvedCube(n))).toBe(false);
    }
  });
});

describe('jumpTo', () => {
  it('lands on the same state as stepping there', () => {
    const alg = parseAlg("R U R' U' F D");
    store().load(alg);
    store().jumpTo(4);

    expect(store().cursor).toBe(4);
    expect(cubesEqual(store().cube, applyAlg(createSolvedCube(3), alg.slice(0, 4)))).toBe(true);
  });

  it('clamps out-of-range indices', () => {
    store().load(parseAlg('R U'));
    store().jumpTo(99);
    expect(store().cursor).toBe(2);
    store().jumpTo(-5);
    expect(store().cursor).toBe(0);
  });
});

describe('rewind and reset', () => {
  it('rewind keeps the timeline, reset clears it', () => {
    store().load(parseAlg('R U'));
    playAll();

    store().rewind();
    expect(store().cursor).toBe(0);
    expect(store().queue).toHaveLength(2);
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(true);

    store().reset();
    expect(store().queue).toEqual([]);
  });

  it('changing size clears everything', () => {
    store().load(parseAlg('R U'));
    playAll();
    store().setSize(4);

    expect(store().n).toBe(4);
    expect(store().queue).toEqual([]);
    expect(cubesEqual(store().cube, createSolvedCube(4))).toBe(true);
  });
});

describe('loading a library case', () => {
  it('starts from the setup state and solves when played through', () => {
    const alg = parseAlg("R U R' U R U2 R'"); // Sune
    store().loadCase(invertAlg(alg), alg);

    // The cube starts in the case, not solved.
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(false);
    expect(store().cursor).toBe(0);
    expect(store().queue).toHaveLength(7);

    playAll();
    expect(sameVisibleState(store().cube, createSolvedCube(3))).toBe(true);
  });

  it('rewinds and scrubs relative to the case, not to solved', () => {
    const alg = parseAlg("R U R' U R U2 R'");
    store().loadCase(invertAlg(alg), alg);
    const caseState = store().cube;

    playAll();
    store().rewind();
    expect(cubesEqual(store().cube, caseState)).toBe(true);

    store().jumpTo(3);
    expect(cubesEqual(store().cube, applyAlg(caseState, alg.slice(0, 3)))).toBe(true);
  });
});

describe('entering free play', () => {
  it('starts from a given cube rather than solving', () => {
    const scrambled = applyAlg(createSolvedCube(3), parseAlg("R U R' F2 D"));
    store().enterFreeplay(scrambled);

    expect(cubesEqual(store().cube, scrambled)).toBe(true);
    expect(store().queue).toEqual([]);
    expect(store().cursor).toBe(0);
    expect(store().status).toBe('idle');
  });

  it('makes that cube the point rewind returns to', () => {
    const scrambled = applyAlg(createSolvedCube(3), parseAlg('R U F'));
    store().enterFreeplay(scrambled);

    store().turn(parseAlg('D')[0]);
    settle();
    expect(cubesEqual(store().cube, scrambled)).toBe(false);

    store().rewind();
    expect(cubesEqual(store().cube, scrambled)).toBe(true);
  });

  it('takes the size from the cube it is given', () => {
    store().enterFreeplay(createSolvedCube(5));
    expect(store().n).toBe(5);
    expect(store().cube.n).toBe(5);
  });

  it('falls back to solved when given nothing', () => {
    store().setSize(3);
    store().enterFreeplay(null);
    expect(cubesEqual(store().cube, createSolvedCube(3))).toBe(true);
  });

  it('discards a loaded algorithm', () => {
    store().load(parseAlg("R U R' U'"));
    store().enterFreeplay(createSolvedCube(3));
    expect(store().queue).toEqual([]);
  });
});

describe('playing a solution', () => {
  const solution = () => parseAlg("R U R' U'");

  it('waits to be started rather than playing itself', () => {
    store().enterFreeplay(applyAlg(createSolvedCube(3), parseAlg('R U F')));
    store().playSolution(solution());

    expect(store().queue).toHaveLength(4);
    expect(store().cursor).toBe(0);
    expect(store().current).toBeNull();
    expect(store().status).toBe('paused');
  });

  it('runs from where the cube is and folds back into free play', () => {
    const scrambled = applyAlg(createSolvedCube(3), parseAlg('R U F'));
    store().enterFreeplay(scrambled);
    store().playSolution(solution());

    expect(store().solving).toBe(true);
    expect(store().queue).toHaveLength(4);
    playAll();

    // Once the last move lands the timeline is spent and clears itself.
    expect(store().solving).toBe(false);
    expect(store().queue).toEqual([]);
    expect(store().cursor).toBe(0);
    expect(store().status).toBe('idle');
  });

  it('makes the result the new starting point', () => {
    store().enterFreeplay(applyAlg(createSolvedCube(3), parseAlg('R U F')));
    store().playSolution(solution());
    playAll();
    const after = store().cube;

    store().turn(parseAlg('D')[0]);
    settle();
    store().rewind();
    expect(cubesEqual(store().cube, after)).toBe(true);
  });

  it('ignores an empty solution', () => {
    store().enterFreeplay(createSolvedCube(3));
    store().playSolution([]);
    expect(store().solving).toBe(false);
    expect(store().queue).toEqual([]);
  });

  it('is called off by anything that replaces the timeline', () => {
    store().enterFreeplay(applyAlg(createSolvedCube(3), parseAlg('R U F')));
    store().playSolution(solution());
    expect(store().solving).toBe(true);

    store().enterFreeplay(createSolvedCube(3));
    expect(store().solving).toBe(false);
  });
});
