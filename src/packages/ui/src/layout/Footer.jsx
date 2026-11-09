import { useEffect, useRef, useState } from 'react';
import { TextArrowButton } from '../buttons/TextArrowButton.jsx';
import { DotWordmark } from './DotWordmark.jsx';

export function Footer({
  brand,
  columns = [],
  legalLinks = [],
  copyright,
  wordmark,
  onBackToTop,
  renderLink = defaultRenderLink,
  renderExternalLink = defaultRenderExternalLink,
}) {
  const footerRef = useRef(null);
  const [footerHeight, setFooterHeight] = useState(0);

  // The page scrolls off the footer, which waits underneath (see .footer-reveal in styles.css)
  useEffect(() => {
    const footer = footerRef.current;
    const resizeObserver = new ResizeObserver(() => setFooterHeight(footer.offsetHeight));
    resizeObserver.observe(footer);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      className={`footer-reveal${footerHeight ? ' is-revealing' : ''}`}
      style={footerHeight ? { '--footer-height': `${footerHeight}px` } : undefined}
    >
      <div className="footer-reveal__track">
        <footer ref={footerRef} className="footer-main">
          <div className="footer-header">
            <div className="footer-brand">
              {brand?.logo && <div className="footer-brand__logo">{brand.logo}</div>}
              {brand?.tagline && <p className="footer-brand__statement">{brand.tagline}</p>}
              {brand?.contact?.length > 0 && (
                <div className="footer-brand__contact">
                  {brand.contact.map((item, index) => (
                    <span key={index}>{item}</span>
                  ))}
                </div>
              )}
            </div>

            {brand?.actions?.length > 0 && (
              <div className="footer-ai">
                {brand.actionsTitle && <div className="footer-col-title">{brand.actionsTitle}</div>}
                <div className="footer-ai__list">
                  {brand.actions.map(action =>
                    renderFooterLink(
                      action,
                      renderLink,
                      renderExternalLink,
                      action.className || 'footer-ai__action'
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="footer-nav-row">
            {columns.map(column => (
              <nav
                key={column.title}
                className={`footer-nav-col${column.wide ? ' footer-nav-col--wide' : ''}`}
                aria-label={column.title}
              >
                <div className="footer-col-title">{column.title}</div>
                {column.items.map(item => renderFooterItem(item, renderLink, renderExternalLink))}
              </nav>
            ))}
          </div>

          {/* Takes the leftover height so the bar and the wordmark sit on the bottom edge */}
          <div className="footer-spacer" />

          <div className="footer-bottom">
            {copyright && <span className="footer-bottom__copyright">{copyright}</span>}
            <div className="footer-bottom__links">
              {legalLinks.map(link =>
                renderFooterLink(link, renderLink, renderExternalLink, 'footer-bottom__link')
              )}
              {onBackToTop && (
                <TextArrowButton
                  as="button"
                  type="button"
                  className="footer-bottom__top"
                  label="Back to top"
                  noWrap
                  arrowClassName="footer-bottom__top-arrow"
                  onClick={onBackToTop}
                />
              )}
            </div>
          </div>

          {wordmark && <DotWordmark word={wordmark} className="footer-wordmark" />}
        </footer>
      </div>
    </div>
  );
}

function renderFooterItem(item, renderLink, renderExternalLink) {
  if (item.path || item.href) {
    return renderFooterLink(
      item,
      renderLink,
      renderExternalLink,
      item.className || 'footer-col-link'
    );
  }

  return (
    <span key={item.key || item.label} className="footer-col-text">
      {item.html || item.label}
    </span>
  );
}

function renderFooterLink(item, renderLink, renderExternalLink, className) {
  const children = item.html || item.label;
  if (item.path) return renderLink({ item, className, children });
  return renderExternalLink({ item, className, children });
}

function defaultRenderLink({ item, className, children }) {
  return (
    <a key={item.key || item.path} href={item.path} className={className}>
      {children}
    </a>
  );
}

function defaultRenderExternalLink({ item, className, children }) {
  return (
    <a key={item.key || item.href} href={item.href} className={className}>
      {children}
    </a>
  );
}
