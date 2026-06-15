const ICONS = {
  bluesky: (
    <span className="social-share-button__mark" aria-hidden="true">
      BS
    </span>
  ),
  linkedin: (
    <span className="social-share-button__mark" aria-hidden="true">
      in
    </span>
  ),
  twitter: (
    <span className="social-share-button__mark" aria-hidden="true">
      X
    </span>
  ),
  rss: (
    <span className="social-share-button__mark" aria-hidden="true">
      RSS
    </span>
  ),
  atom: (
    <span className="social-share-button__mark" aria-hidden="true">
      Atom
    </span>
  ),
  copy: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M10 5V3.5A1.5 1.5 0 0 0 8.5 2h-5A1.5 1.5 0 0 0 2 3.5v5A1.5 1.5 0 0 0 3.5 10H5" />
    </svg>
  ),
};

export function SocialShareButtons({ items, className = '' }) {
  return (
    <div className={`social-share-buttons ${className}`.trim()}>
      {items.map(item => {
        const content = (
          <>
            {ICONS[item.icon] || item.icon}
            <span className="social-share-button__label">{item.label}</span>
          </>
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
            className="social-share-button social-share-button--text"
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
