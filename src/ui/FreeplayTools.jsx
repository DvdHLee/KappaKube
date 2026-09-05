import { useState } from 'react';
import { createSolvedCube } from '../core/cube.js';
import { canSolve, solveCube } from '../core/solver.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';

/**
 * Reset and Solve, in the cube's top-left corner opposite the lock.
 *
 * Shown whenever no library case is loaded — including while a solution plays,
 * so the buttons do not vanish mid-solve.
 *
 * Reset returns to solved at once. Solve works out a solution and turns the
 * cube through it; the solver ships as a separate chunk, so the first press may
 * pause briefly while it downloads.
 */
export default function FreeplayTools() {
  const n = useCubeStore((s) => s.n);
  const cube = useCubeStore((s) => s.cube);
  const busy = useCubeStore((s) => s.current !== null);
  const solving = useCubeStore((s) => s.solving);
  const enterFreeplay = useCubeStore((s) => s.enterFreeplay);
  const shuffle = useCubeStore((s) => s.shuffle);
  const playSolution = useCubeStore((s) => s.playSolution);
  const selectedCaseId = usePrefsStore((s) => s.selectedCaseId);

  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState(false);

  if (selectedCaseId) return null; // a case is loaded; Learned sits here instead

  const solvable = canSolve(n);

  const solve = async () => {
    setThinking(true);
    setFailed(false);
    try {
      playSolution(await solveCube(cube));
    } catch {
      // A solver that will not load or a state it rejects should say so rather
      // than leave the button spinning.
      setFailed(true);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {solvable && (
        <button
          type="button"
          className={`cube-corner-btn ${failed ? 'is-error' : ''}`}
          disabled={thinking || solving || busy}
          title={
            failed ? 'The solver could not be reached' : 'Work out a solution and turn the cube'
          }
          onClick={solve}
        >
          {thinking ? 'Solving…' : failed ? 'Failed' : 'Solve'}
        </button>
      )}

      <button
        type="button"
        className="cube-corner-btn"
        disabled={busy || solving}
        title="Scramble the cube"
        onClick={shuffle}
      >
        Shuffle
      </button>

      <button
        type="button"
        className="cube-corner-btn"
        disabled={busy}
        title="Return the cube to solved"
        onClick={() => enterFreeplay(createSolvedCube(n))}
      >
        Reset
      </button>
    </>
  );
}
