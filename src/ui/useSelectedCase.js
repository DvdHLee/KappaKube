import { CASES_BY_ID } from '../data/cases.js';
import { usePrefsStore } from '../state/usePrefsStore.js';

/** The library case currently loaded on the cube, if any. */
export function useSelectedCase() {
  const id = usePrefsStore((s) => s.selectedCaseId);
  return id ? (CASES_BY_ID.get(id) ?? null) : null;
}
