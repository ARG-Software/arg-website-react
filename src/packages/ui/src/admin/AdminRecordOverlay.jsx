import { UiCard } from '../primitives/UiCard.jsx';

export function AdminRecordOverlay({ isOpen, title, eyebrow, actions, children, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="admin-record-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button
        className="admin-record-overlay__backdrop"
        type="button"
        onClick={onClose}
        aria-label="Close"
      />
      <UiCard className="admin-record-overlay__panel">
        <button
          type="button"
          className="admin-record-overlay__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="admin-record-overlay__header">
          <div>
            {eyebrow && <p>{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <div className="admin-record-overlay__actions">{actions}</div>
        </div>
        {children}
      </UiCard>
    </div>
  );
}
