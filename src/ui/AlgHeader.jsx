import { useEffect, useRef, useState } from 'react';
import { formatAlg } from '../core/notation.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';
import { useSelectedCase } from './useSelectedCase.js';
import CaseDiagram from './CaseDiagram.jsx';
import { algIndexFor, useLoadCase } from './useLoadCase.js';

/**
 * The algorithm being worked on, sitting above the cube with the move that is
 * about to play picked out. Clicking a move scrubs straight to it.
 *
 * Where a case has more than one algorithm the title becomes a menu: the list
 * of variations is long and monospaced, and showing it permanently pushed the
 * cube down the screen for something you change rarely.
 */
export default function AlgHeader() {
  const testCase = useSelectedCase();
  const n = useCubeStore((s) => s.n);
  const queue = useCubeStore((s) => s.queue);
  const cursor = useCubeStore((s) => s.cursor);
  const current = useCubeStore((s) => s.current);
  const jumpTo = useCubeStore((s) => s.jumpTo);
  const busy = current !== null;

  const completed = usePrefsStore((s) => s.completed);
  const toggleCompleted = usePrefsStore((s) => s.toggleCompleted);
  const chosenAlg = usePrefsStore((s) => s.chosenAlg);
  const load = useLoadCase();

  // Which case's menu is open, rather than a bare boolean: selecting a
  // different case then closes it by derivation, with no effect to sync.
  const [openFor, setOpenFor] = useState(null);
  const headRef = useRef(null);
  const open = openFor !== null && openFor === testCase?.id;

  // Close on a click anywhere else, or on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!headRef.current?.contains(event.target)) setOpenFor(null);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenFor(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (queue.length === 0) {
    return (
      <div className="algbar is-empty">
        <span className="algbar-hint">Freeplay</span>
      </div>
    );
  }

  // Mid-turn the cursor still points at the move being played; afterwards it
  // has advanced past it.
  const activeMove = current?.direction === 1 ? cursor : cursor - 1;

  const variations = testCase?.algs ?? [];
  const chosen = testCase ? algIndexFor(testCase, chosenAlg) : 0;
  const hasChoice = variations.length > 1;

  return (
    <div className="algbar">
      {testCase && (
        <div className="algbar-head" ref={headRef}>
          <CaseDiagram
            view={testCase.view}
            kind={testCase.kind}
            size={54}
            className="algbar-diagram"
          />

          <button
            type="button"
            className="algbar-title"
            disabled={!hasChoice}
            aria-expanded={hasChoice ? open : undefined}
            aria-haspopup={hasChoice ? 'menu' : undefined}
            title={hasChoice ? `${variations.length} variations` : testCase.label}
            onClick={() => hasChoice && setOpenFor(open ? null : testCase.id)}
          >
            <span className="algbar-name">{testCase.name}</span>
            {hasChoice && <span className="algbar-caret">▼</span>}
          </button>

          <span className="algbar-group">{testCase.group}</span>

          <label className="algbar-done">
            <input
              type="checkbox"
              checked={Boolean(completed[testCase.id])}
              onChange={() => toggleCompleted(testCase.id)}
            />
            Learned
          </label>

          {open && hasChoice && (
            <div className="algbar-variants" role="menu">
              <span className="hud-label algbar-variants-label">
                {variations.length} variations
              </span>
              {variations.map((alg, i) => (
                <button
                  key={alg}
                  type="button"
                  role="menuitemradio"
                  aria-checked={i === chosen}
                  disabled={busy}
                  className={`variant ${i === chosen ? 'is-active' : ''}`}
                  title={`${alg.split(' ').length} moves`}
                  onClick={() => {
                    load(testCase, i);
                    setOpenFor(null);
                  }}
                >
                  {alg}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="algbar-moves">
        {/*
         * The marker follows the move being performed, not the one queued next.
         * While a turn animates that is the move at the cursor; once it lands
         * the cursor has moved past it, so it is the one before. Defining it
         * this way is what lets a click reproduce exactly what playback shows:
         * clicking a move runs up to and including it, and marks it.
         */}
        {queue.map((move, i) => (
          <button
            key={i}
            type="button"
            disabled={busy}
            title={`Jump to move ${i + 1}`}
            className={`algbar-move ${i < activeMove ? 'is-done' : ''} ${
              i === activeMove ? 'is-current' : ''
            }`}
            onClick={() => jumpTo(i + 1)}
          >
            {formatAlg([move], n)}
          </button>
        ))}
      </div>
    </div>
  );
}
