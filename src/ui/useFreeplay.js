import { useCallback, useEffect } from 'react';
import { createSolvedCube } from '../core/cube.js';
import { deserializeCube, serializeCube } from '../core/serialize.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';

/**
 * Drop whatever case is loaded and return to the free cube for a given size —
 * the one left behind last time, not a solved one.
 */
export function useEnterFreeplay() {
  const enterFreeplay = useCubeStore((s) => s.enterFreeplay);
  const selectCase = usePrefsStore((s) => s.selectCase);
  const remembered = usePrefsStore((s) => s.freeplay);

  return useCallback(
    (n) => {
      selectCase(null);
      enterFreeplay(deserializeCube(remembered[n]) ?? createSolvedCube(n));
    },
    [enterFreeplay, selectCase, remembered],
  );
}

/**
 * Keep the stored freeplay cube in step with the one on screen.
 *
 * Only while no algorithm is loaded: practising a case must not overwrite the
 * cube the user was playing with. Free turns happen at human speed, so writing
 * on each one costs nothing.
 */
export function useRememberFreeplay() {
  const cube = useCubeStore((s) => s.cube);
  const queue = useCubeStore((s) => s.queue);
  const remember = usePrefsStore((s) => s.rememberFreeplay);

  useEffect(() => {
    if (queue.length > 0) return; // a case is loaded
    remember(cube.n, serializeCube(cube));
  }, [cube, queue, remember]);
}
