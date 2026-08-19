export function UiSpinner({ className = '', label = 'Loading…' }) {
  return (
    <span
      className={['ui-spinner', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="ui-spinner__ring" aria-hidden="true" />
      {label && <span className="ui-spinner__label">{label}</span>}
    </span>
  );
}
