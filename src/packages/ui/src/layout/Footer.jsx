import { SectionDivider } from './SectionDivider.jsx';

export function Footer({
  brand,
  columns = [],
  legalLinks = [],
  copyright,
  renderLink = defaultRenderLink,
  renderExternalLink = defaultRenderExternalLink,
  animate = true,
  animationPreset = 'fade-up',
  animationStagger = 80,
}) {
  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': animationPreset,
        'data-animate-default-stagger': String(animationStagger),
      }
    : {};

  return (
    <>
      <SectionDivider
        variant="light"
        data-animate={animate ? 'divider-expander-show' : undefined}
      />

      <footer className="footer-main" {...scopeAttrs}>
        <div className="container padding-global">
          <div className="footer-wrapper">
            <div className="footer-left" data-animate-order={animate ? '0' : undefined}>
              {brand?.logo && <div className="footer-left__logo">{brand.logo}</div>}
              {brand?.tagline && <div className="footer-left__tagline">{brand.tagline}</div>}
            </div>

            <div className="footer-right">
              <div className="footer-nav-row" data-animate-order={animate ? '1' : undefined}>
                {columns.map(column => (
                  <FooterColumn
                    key={column.title}
                    column={column}
                    renderLink={renderLink}
                    renderExternalLink={renderExternalLink}
                  />
                ))}
              </div>

              <SectionDivider
                variant="light"
                data-animate={animate ? 'divider-expander-show' : undefined}
                data-animate-order={animate ? '2' : undefined}
              />

              <div className="footer-bottom" data-animate="">
                {legalLinks.map(link =>
                  renderFooterLink(link, renderLink, renderExternalLink, 'footer-bottom__link')
                )}
                {copyright && <span className="footer-bottom__copyright">{copyright}</span>}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterColumn({ column, renderLink, renderExternalLink }) {
  return (
    <div className="footer-nav-col">
      <div className="footer-col-title">{column.title}</div>
      <div className="footer-col-list">
        {column.items.map(item => renderFooterItem(item, renderLink, renderExternalLink))}
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

  if (item.html) {
    return (
      <span key={item.key || item.label} className="footer-col-text">
        {item.html}
      </span>
    );
  }

  return (
    <span key={item.key || item.label} className="footer-col-text">
      {item.label}
    </span>
  );
}

function renderFooterLink(item, renderLink, renderExternalLink, className) {
  if (item.path) return renderLink({ item, className, children: item.label });
  return renderExternalLink({ item, className, children: item.label });
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
