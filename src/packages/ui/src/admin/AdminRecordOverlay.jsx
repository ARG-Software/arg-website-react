import { UiButton } from '../primitives/UiButton.jsx';
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
        <div className="admin-record-overlay__header">
          <div>
            {eyebrow && <p>{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <div className="admin-record-overlay__actions">
            {actions}
            <UiButton variant="secondary" onClick={onClose}>
              Close
            </UiButton>
          </div>
        </div>
        {children}
      </UiCard>
    </div>
  );
}
