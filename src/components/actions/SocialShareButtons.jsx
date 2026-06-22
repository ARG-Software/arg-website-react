import { AtomIcon } from '../icons/AtomIcon';
import { BlueskyIcon } from '../icons/BlueskyIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { LinkedInIcon } from '../icons/LinkedInIcon';
import { RssIcon } from '../icons/RssIcon';
import { XIcon } from '../icons/XIcon';

const ACTION_ICONS = {
  atom: AtomIcon,
  bluesky: BlueskyIcon,
  copy: CopyIcon,
  linkedin: LinkedInIcon,
  rss: RssIcon,
  twitter: XIcon,
  x: XIcon,
};

export function SocialShareButtons({
  items,
  className = '',
  label = 'Share',
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
}) {
  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      className={`social-share-buttons ${className}`.trim()}
      aria-label={label}
      {...animationAttrs}
    >
      <span className="social-share-buttons__label">{label}</span>
      {items.map(item => {
        const Icon = ACTION_ICONS[item.icon || item.id];
        const content = (
          <span className="social-share-button__icon" aria-hidden="true">
            {Icon ? <Icon /> : item.label}
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
