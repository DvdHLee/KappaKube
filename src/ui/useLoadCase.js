import { useCallback } from 'react';
import { parseAlg } from '../core/notation.js';
import { invertAlg } from '../core/moves.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';

/**
 * Which algorithm a case should use: the remembered choice, or the first.
 * Clamped, so a stored index survives the list of variants changing.
 */
export function algIndexFor(testCase, chosenAlg) {
  const stored = chosenAlg[testCase.id] ?? 0;
  return Math.min(Math.max(stored, 0), testCase.algs.length - 1);
}

/**
 * Put a case on the cube. Shared by the menu and the variant picker so the two
 * cannot disagree about which algorithm a case is currently using.
 */
export function useLoadCase() {
  const loadCase = useCubeStore((s) => s.loadCase);
  const selectCase = usePrefsStore((s) => s.selectCase);
  const chooseAlg = usePrefsStore((s) => s.chooseAlg);
  const chosenAlg = usePrefsStore((s) => s.chosenAlg);

  return useCallback(
    (testCase, algIndex) => {
      const index = algIndex ?? algIndexFor(testCase, chosenAlg);
      if (algIndex !== undefined) chooseAlg(testCase.id, algIndex);

      selectCase(testCase.id);
      const alg = parseAlg(testCase.algs[index], testCase.n);
      loadCase(invertAlg(alg), alg, testCase.n);
    },
    [loadCase, selectCase, chooseAlg, chosenAlg],
  );
}
