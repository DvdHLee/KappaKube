import { useCubeStore } from '../state/useCubeStore.js';
import { MAX_SPEED, MIN_SPEED, usePrefsStore } from '../state/usePrefsStore.js';

/**
 * Transport icons drawn inline rather than typed as characters.
 *
 * U+23EE (the skip-to-start glyph) carries Emoji_Presentation=Yes, so iOS drew
 * it as a colour emoji while the plain triangles beside it stayed as text —
 * hence one button looking nothing like its neighbours. Drawing them keeps all
 * three identical and inheriting the button's colour.
 */
function Icon({ children }) {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

const RewindIcon = () => (
  <Icon>
    <rect x="3.4" y="3" width="1.9" height="10" rx="0.6" />
    <path d="M13 3.6v8.8a.6.6 0 0 1-.94.5L6.2 8.5a.6.6 0 0 1 0-1l5.86-4.4a.6.6 0 0 1 .94.5Z" />
  </Icon>
);

const PrevIcon = () => (
  <Icon>
    <path d="M11.6 3.6v8.8a.6.6 0 0 1-.94.5L4.3 8.5a.6.6 0 0 1 0-1l6.36-4.4a.6.6 0 0 1 .94.5Z" />
  </Icon>
);

const NextIcon = () => (
  <Icon>
    <path d="M4.4 3.6v8.8a.6.6 0 0 0 .94.5L11.7 8.5a.6.6 0 0 0 0-1L5.34 3.1a.6.6 0 0 0-.94.5Z" />
  </Icon>
);

/** Playback controls, below the cube. */
export default function Transport() {
  const queue = useCubeStore((s) => s.queue);
  const cursor = useCubeStore((s) => s.cursor);
  const status = useCubeStore((s) => s.status);
  const speed = usePrefsStore((s) => s.speed);
  const busy = useCubeStore((s) => s.current !== null);

  const play = useCubeStore((s) => s.play);
  const pause = useCubeStore((s) => s.pause);
  const stepForward = useCubeStore((s) => s.stepForward);
  const stepBack = useCubeStore((s) => s.stepBack);
  const rewind = useCubeStore((s) => s.rewind);
  const setSpeed = usePrefsStore((s) => s.setSpeed);

  const atEnd = cursor >= queue.length;
  const playing = status === 'playing';

  // Nothing to play in freeplay, so the controls stand down entirely.
  if (queue.length === 0) return null;

  return (
    <div className="transport">
      <div className="transport-row">
        <button
          className="hud-btn hud-btn--icon"
          onClick={rewind}
          disabled={busy || cursor === 0}
          aria-label="Back to the beginning"
          title="Back to the beginning"
        >
          <RewindIcon />
        </button>
        <button
          className="hud-btn hud-btn--icon"
          onClick={stepBack}
          disabled={busy || cursor === 0}
          aria-label="Step back"
          title="Step back (←)"
        >
          <PrevIcon />
        </button>
        <button
          className="hud-btn hud-btn--primary"
          onClick={playing ? pause : play}
          disabled={queue.length === 0 || (atEnd && !playing)}
          title="Play / pause (space)"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          className="hud-btn hud-btn--icon"
          onClick={stepForward}
          disabled={busy || atEnd}
          aria-label="Step forward"
          title="Step forward (→)"
        >
          <NextIcon />
        </button>
        <span className="transport-count">
          {cursor} / {queue.length}
        </span>
      </div>

      <div className="transport-row transport-speed">
        <span className="hud-label">Speed</span>
        {/* Inverted: dragging right should mean faster, but speed is a duration. */}
        <input
          type="range"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={20}
          value={MIN_SPEED + MAX_SPEED - speed}
          onChange={(e) => setSpeed(MIN_SPEED + MAX_SPEED - Number(e.target.value))}
        />
        <span className="transport-count">{speed} ms</span>
      </div>
    </div>
  );
}
