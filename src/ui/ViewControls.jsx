const VIEWS = [
  ['iso', 'Iso'],
  ['free', 'Free'],
];

const SIZES = [2, 3, 4];

export default function ViewControls({ n, activeView, onSize, onView, autoRotate, onAutoRotate }) {
  return (
    <div className="hud">
      <div className="hud-group">
        <span className="hud-label">View</span>
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            className={`hud-btn ${key === activeView ? 'is-active' : ''}`}
            onClick={() => onView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hud-sep" />

      <div className="hud-group">
        <span className="hud-label">Size</span>
        {SIZES.map((size) => (
          <button
            key={size}
            className={`hud-btn ${size === n ? 'is-active' : ''}`}
            onClick={() => onSize(size)}
          >
            {size}x{size}
          </button>
        ))}
      </div>

      <div className="hud-sep" />

      <button
        className={`hud-btn ${autoRotate ? 'is-active' : ''}`}
        onClick={() => onAutoRotate(!autoRotate)}
      >
        Auto-rotate
      </button>
    </div>
  );
}
