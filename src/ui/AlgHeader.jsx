import { formatAlg } from '../core/notation.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';
import { useSelectedCase } from './useSelectedCase.js';
import CaseDiagram from './CaseDiagram.jsx';
import { algIndexFor, useLoadCase } from './useLoadCase.js';

/**
 * The algorithm being worked on, sitting above the cube with the move that is
 * about to play picked out. Clicking a move scrubs straight to it.
 */
export default function AlgHeader() {
  const testCase = useSelectedCase();
  const n = useCubeStore((s) => s.n);
  const queue = useCubeStore((s) => s.queue);
  const cursor = useCubeStore((s) => s.cursor);
  const busy = useCubeStore((s) => s.current !== null);
  const jumpTo = useCubeStore((s) => s.jumpTo);

  const completed = usePrefsStore((s) => s.completed);
  const toggleCompleted = usePrefsStore((s) => s.toggleCompleted);
  const chosenAlg = usePrefsStore((s) => s.chosenAlg);
  const load = useLoadCase();

  if (queue.length === 0) {
    return (
      <div className="algbar is-empty">
        <span className="algbar-hint">
          Pick an algorithm from the library, or turn the cube with the buttons and keyboard.
        </span>
      </div>
    );
  }

  return (
    <div className="algbar">
      {testCase && (
        <div className="algbar-head">
          <CaseDiagram
            view={testCase.view}
            kind={testCase.kind}
            size={54}
            className="algbar-diagram"
          />
          <span className="algbar-name">{testCase.name}</span>
          <span className="algbar-group">{testCase.group}</span>
          <label className="algbar-done">
            <input
              type="checkbox"
              checked={Boolean(completed[testCase.id])}
              onChange={() => toggleCompleted(testCase.id)}
            />
            Learned
          </label>
        </div>
      )}

      {testCase && testCase.algs.length > 1 && (
        <div className="algbar-variants">
          <span className="hud-label">Variation</span>
          {testCase.algs.map((alg, i) => (
            <button
              key={alg}
              type="button"
              disabled={busy}
              className={`variant ${i === algIndexFor(testCase, chosenAlg) ? 'is-active' : ''}`}
              title={`${alg.split(' ').length} moves`}
              onClick={() => load(testCase, i)}
            >
              {alg}
            </button>
          ))}
        </div>
      )}

      <div className="algbar-moves">
        {queue.map((move, i) => (
          <button
            key={i}
            type="button"
            disabled={busy}
            title={`Jump to after move ${i + 1}`}
            className={`algbar-move ${i < cursor ? 'is-done' : ''} ${i === cursor ? 'is-next' : ''}`}
            onClick={() => jumpTo(i + 1)}
          >
            {formatAlg([move], n)}
          </button>
        ))}
      </div>
    </div>
  );
}
