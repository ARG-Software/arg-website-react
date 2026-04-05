import React from 'react';
import { arrowSvg } from '../icons/SocialIcons';
import { trackOutbound } from '../../hooks/useAnalytics';

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
}) {
  const animationDelay = `${(index * 0.8) % 4}s`;
  return (
    <div id={slug} className={`pp-partner-row${flip ? ' pp-flip' : ''} ${className}`}>
      <div className={`pp-partner-visual${animate ? ' pp-animate' : ''}`}>
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
      <div className={`pp-partner-body pp-animate pp-d1`}>
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
            className="text-button w-inline-block"
            onClick={() => trackOutbound(link, name, 'partner_row')}
          >
            <div className="text-button_list is-dark">
              <div className="text-button_text">Visit website</div>
              <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
            </div>
            <div className="text-button_list is-animated is-dark">
              <div className="text-button_text">Open site</div>
              <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
