const ACTION_ICONS = {
  bluesky: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.305.902 1.602.139 1.946 0 3.094 0 3.769c0 .67.371 5.494.612 6.297.804 2.66 3.609 3.557 6.192 3.27.131-.02.265-.038.402-.052-.137.022-.271.041-.402.062-3.786.554-7.146 1.926-2.732 6.851C9.066 24.74 10.927 15.06 11.937 10.05c.005-.024.01-.047.012-.07.001-.023.005-.046.012-.07 0 0 .003-.011.005-.02L12 10.8z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.339 18.337v-7.272H5.671v7.272h2.668zM7.005 9.737a1.547 1.547 0 1 0 0-3.094 1.547 1.547 0 0 0 0 3.094zM18.336 18.337v-3.985c0-2.31-.5-4.083-3.197-4.083-1.298 0-2.169.712-2.526 1.388h-.036v-1.173h-2.56v7.853h2.667v-3.886c0-1.025.195-2.018 1.467-2.018 1.253 0 1.272 1.173 1.272 2.085v3.819h2.913z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  copy: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M10 5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5v5A1.5 1.5 0 0 0 3.5 10H5" />
    </svg>
  ),
  rss: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 5c7.7 0 14 6.3 14 14" />
      <path d="M5 11c4.4 0 8 3.6 8 8" />
      <path d="M6 18.5h.01" />
    </svg>
  ),
  atom: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(120 12 12)" />
    </svg>
  ),
};

export function SocialShareButtons({ items, className = '', label = 'Share' }) {
  return (
    <div className={`social-share-buttons ${className}`.trim()} aria-label={label}>
      <span className="social-share-buttons__label">{label}</span>
      {items.map(item => {
        const content = (
          <span className="social-share-button__icon" aria-hidden="true">
            {ACTION_ICONS[item.icon || item.id] || item.label}
          </span>
        );

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              target={item.target || '_blank'}
              rel={item.rel || 'noopener noreferrer'}
              className="social-share-button"
              aria-label={item.ariaLabel || item.label}
              title={item.label}
              onClick={item.onClick}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className="social-share-button"
            aria-label={item.ariaLabel || item.label}
            title={item.label}
            onClick={item.onClick}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
