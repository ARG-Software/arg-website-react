import React from 'react';
import { arrowSvg } from '../icons/SocialIcons';

export function PartnerRow({
  name,
  slug,
  description,
  image,
  imageAlt,
  tag,
  link,
  flip = false,
  animate = true,
  role,
  className = '',
  children,
  index = 0,
  onLinkClick,
}) {
  const animationDelay = `${(index * 0.8) % 4}s`;
  return (
    <div id={slug} className={`pp-partner-row${flip ? ' pp-flip' : ''} ${className}`}>
      <div className={`pp-partner-visual${animate ? ' pp-animate' : ''}`} data-animate="fade-up">
        {children ? (
          children
        ) : image ? (
          <img
            src={image}
            alt={imageAlt || name}
            loading="lazy"
            className="color-reveal"
            style={{ animationDelay: animationDelay }}
          />
        ) : null}
      </div>
      <div className={`pp-partner-body pp-animate pp-d1`} data-animate="fade-up">
        {tag && (
          <div className="pp-partner-tag">
            <div className="subtitle_tag-wrapper">
              <div>{tag}</div>
            </div>
          </div>
        )}
        <h3 className="pp-partner-name">{name}</h3>
        {role && <p className="pp-partner-role">{role}</p>}
        <p className="pp-partner-desc">{description}</p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="button-base button-contact"
            onClick={() => onLinkClick?.(link, name)}
          >
            <div className="button-base_text_wrap">
              <div className="button-base__button-text">Visit website</div>
              <div className="button-base__button-text is-animated">Open site {arrowSvg}</div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
