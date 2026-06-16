export function SocialShareButtons({ items, className = '' }) {
  return (
    <div className={`social-share-buttons ${className}`.trim()}>
      {items.map(item => {
        const content = <span className="social-share-button__label">{item.label}</span>;

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
