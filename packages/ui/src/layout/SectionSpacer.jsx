const ALLOWED_COLORS = new Set(['white', 'dark']);
const ALLOWED_SIZES = new Set(['sm', 'md', 'lg']);
const ALLOWED_MULTIPLIERS = new Set([1, 2, 3]);

export function SectionSpacer({ color = 'white', size = 'md', multiplier = 1, className = '' }) {
  const spacerColor = ALLOWED_COLORS.has(color) ? color : 'white';
  const spacerSize = ALLOWED_SIZES.has(size) ? size : 'md';
  const normalizedMultiplier = Number(multiplier);
  const spacerMultiplier = ALLOWED_MULTIPLIERS.has(normalizedMultiplier) ? normalizedMultiplier : 1;

  return (
    <div
      className={`section-spacer section-spacer--${spacerColor} section-spacer--${spacerSize} ${className}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: spacerMultiplier }, (_, index) => (
        <span className="section-spacer__unit" key={index} />
      ))}
    </div>
  );
}
