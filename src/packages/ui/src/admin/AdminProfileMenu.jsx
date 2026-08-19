import { useEffect, useRef, useState } from 'react';

export function AdminProfileMenu({ items = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (!isOpen) return undefined;

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="admin-profile-menu" ref={containerRef}>
      <button
        type="button"
        className="admin-profile-menu__trigger"
        onClick={() => setIsOpen(current => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="admin-profile-menu__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M4 20c0-4 4-6 8-6s8 2 8 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul className="admin-profile-menu__dropdown" role="menu">
          {items.map((item, index) => (
            <li key={item.label || index} role="none">
              <button
                type="button"
                className="admin-profile-menu__item"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
