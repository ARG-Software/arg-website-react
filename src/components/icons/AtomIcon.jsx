export function AtomIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(120 12 12)" />
    </svg>
  );
}
