export function SectionTicker({ label, className = '' }) {
  const classes = ['section-ticker', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span className="section-ticker__label">{label}</span>
      <span className="section-ticker__line" aria-hidden="true" />
    </div>
  );
}
