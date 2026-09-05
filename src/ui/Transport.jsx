import { MAX_SPEED, MIN_SPEED, useCubeStore } from '../state/useCubeStore.js';

/** Playback controls, below the cube. */
export default function Transport() {
  const queue = useCubeStore((s) => s.queue);
  const cursor = useCubeStore((s) => s.cursor);
  const status = useCubeStore((s) => s.status);
  const speed = useCubeStore((s) => s.speed);
  const busy = useCubeStore((s) => s.current !== null);

  const play = useCubeStore((s) => s.play);
  const pause = useCubeStore((s) => s.pause);
  const stepForward = useCubeStore((s) => s.stepForward);
  const stepBack = useCubeStore((s) => s.stepBack);
  const rewind = useCubeStore((s) => s.rewind);
  const reset = useCubeStore((s) => s.reset);
  const setSpeed = useCubeStore((s) => s.setSpeed);

  const atEnd = cursor >= queue.length;
  const playing = status === 'playing';

  // Nothing to play in freeplay, so the controls stand down entirely.
  if (queue.length === 0) return null;

  return (
    <div className="transport">
      <div className="transport-row">
        <button
          className="hud-btn"
          onClick={rewind}
          disabled={busy || cursor === 0}
          title="Restart"
        >
          ⏮
        </button>
        <button
          className="hud-btn"
          onClick={stepBack}
          disabled={busy || cursor === 0}
          title="Step back (←)"
        >
          ◀
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
          className="hud-btn"
          onClick={stepForward}
          disabled={busy || atEnd}
          title="Step forward (→)"
        >
          ▶
        </button>
        <button className="hud-btn" onClick={reset} disabled={busy} title="Clear and solve">
          Reset
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
