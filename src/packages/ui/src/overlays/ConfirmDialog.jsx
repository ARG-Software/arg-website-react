import { useEffect } from 'react';

import { UiButton } from '../primitives/UiButton.jsx';
import { UiCard } from '../primitives/UiCard.jsx';

export function ConfirmDialog({
  isOpen,
  title,
  children,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
      <button
        className="confirm-dialog__backdrop"
        type="button"
        aria-label={cancelLabel}
        onClick={onCancel}
      />
      <UiCard className="confirm-dialog__panel">
        <div className="confirm-dialog__copy">
          <h2>{title}</h2>
          {children && <div className="confirm-dialog__body">{children}</div>}
        </div>
        <div className="confirm-dialog__actions">
          <UiButton variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </UiButton>
          <UiButton onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </UiButton>
        </div>
      </UiCard>
    </div>
  );
}
