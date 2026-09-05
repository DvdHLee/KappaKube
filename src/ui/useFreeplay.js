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
 * Gated on no library case being loaded rather than on an empty timeline: a
 * solution sitting on the timeline is still the user's own cube and worth
 * remembering, whereas practising a case must not overwrite it. Free turns
 * happen at human speed, so writing on each one costs nothing.
 */
export function useRememberFreeplay() {
  const cube = useCubeStore((s) => s.cube);
  const remember = usePrefsStore((s) => s.rememberFreeplay);
  const selectedCaseId = usePrefsStore((s) => s.selectedCaseId);

  useEffect(() => {
    if (selectedCaseId) return; // practising a case
    remember(cube.n, serializeCube(cube));
  }, [cube, selectedCaseId, remember]);
}
