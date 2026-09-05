import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';
import { useSelectedCase } from './useSelectedCase.js';

/**
 * Mark the loaded case as learned. Sits in the cube's top-left corner, opposite
 * the lock, and shares its geometry so the two line up exactly.
 */
export default function LearnedToggle() {
  const testCase = useSelectedCase();
  const queue = useCubeStore((s) => s.queue);
  const completed = usePrefsStore((s) => s.completed);
  const toggleCompleted = usePrefsStore((s) => s.toggleCompleted);

  // Same test the header uses to decide it is showing "Freeplay", so the two
  // cannot disagree about whether a case is on the cube.
  if (!testCase || queue.length === 0) return null;

  const learned = Boolean(completed[testCase.id]);

  return (
    <button
      type="button"
      className={`cube-corner-btn learn-btn ${learned ? 'is-active' : ''}`}
      aria-pressed={learned}
      aria-label={learned ? 'Learned — click to unmark' : 'Mark as learned'}
      title={learned ? 'Learned — click to unmark' : 'Mark as learned'}
      onClick={() => toggleCompleted(testCase.id)}
    >
      ✓
    </button>
  );
}
