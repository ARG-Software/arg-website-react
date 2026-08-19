import { useEffect, useCallback } from 'react';

export function Drawer({ isOpen, onClose, children }) {
  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdrop = e => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="pc-drawer-overlay" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div className="pc-drawer-backdrop" />
      <div className="pc-drawer-panel">
        <button className="pc-drawer-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
