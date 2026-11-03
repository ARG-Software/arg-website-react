import { ANIMATION_PRESETS, HOVER_PRESETS } from '../../animations/attribute-presets';

const PRESET = HOVER_PRESETS[ANIMATION_PRESETS.slotText];

// The colour at a point along the gradient, from 0 at the first letter to 1 at the last
function gradientAt(position) {
  const { colors } = PRESET;
  const scaled = position * (colors.length - 1);
  const index = Math.min(Math.floor(scaled), colors.length - 2);
  const share = Math.round((scaled - index) * 100);
  return `color-mix(in srgb, ${colors[index + 1]} ${share}%, ${colors[index]})`;
}

// Text whose letters roll over like a slot machine when its parent is hovered or focused.
// Screen readers get the plain text; the letter reels are only drawn.
export function SlotText({ text }) {
  const letters = [...text];
  const last = Math.max(letters.length - 1, 1);

  return (
    <span
      className="slot-text"
      data-animate-hover={ANIMATION_PRESETS.slotText}
      style={{
        '--slot-duration': PRESET.duration,
        '--slot-stagger': PRESET.stagger,
        '--slot-ease': PRESET.ease,
      }}
    >
      <span className="slot-text__label">{text}</span>
      <span className="slot-text__reels" aria-hidden="true">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="slot-text__reel"
            style={{ '--i': index, '--slot-color': gradientAt(index / last) }}
          >
            <span>{letter}</span>
            <span>{letter}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
