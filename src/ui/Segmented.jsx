/**
 * A small segmented control with a sliding indicator.
 *
 * The highlight is a single absolutely-positioned thumb that transforms into
 * place, rather than a background on the active button — so the selection
 * appears to travel between options instead of blinking from one to the next.
 * Its width and travel come from CSS variables, so the same rule works for any
 * number of options.
 *
 * In `swatch` mode each option is a block of colour and the thumb becomes a
 * ring that slides around the chosen one, since the colour itself is the label.
 *
 * @param {object} props
 * @param {{ value: string, label?: string, color?: string, title?: string }[]} props.options
 * @param {'text' | 'swatch'} [props.variant]
 */
export default function Segmented({ options, value, onChange, label, variant = 'text' }) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div className="segmented-row">
      {label && <span className="hud-label">{label}</span>}
      <div
        className={`segmented ${variant === 'swatch' ? 'segmented--swatch' : ''}`}
        role="group"
        aria-label={label}
        style={{ '--count': options.length, '--index': index }}
      >
        <span className="segmented-thumb" aria-hidden="true" />
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title ?? option.label ?? option.value}
            aria-label={option.title ?? option.label ?? option.value}
            aria-pressed={option.value === value}
            className={`segment ${option.value === value ? 'is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {variant === 'swatch' ? (
              <span className="segment-chip" style={{ background: option.color }} />
            ) : (
              option.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
