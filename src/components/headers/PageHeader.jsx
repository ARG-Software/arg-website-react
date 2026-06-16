import { Breadcrumb } from '../navigation/Breadcrumb';
import AppLink from '../navigation/AppLink';

/**
 * Unified page header component for subpages.
 * @param {Object} props
 * @param {string|string[]} props.title - Page title (string or array for multi-line titles)
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {Array} [props.breadcrumbs] - Optional breadcrumb items: { label: string, path?: string, isTag?: boolean }
 * @param {Array} [props.sideItems] - Optional right-column links: { label: string, href?: string, to?: string, meta?: string }
 * @param {string} [props.sideLabel] - Right-column label
 * @param {string} [props.sideText] - Optional right-column text block
 * @param {React.ReactNode} [props.children] - Optional children for special content (e.g., stats grid for Clients page)
 * @param {string} [props.size] - Header size: 'default' (50vh), 'large' (56vh), 'small' (42vh)
 * @param {string} [props.variant] - Optional visual variant
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  sideItems = [],
  sideLabel = 'On this page',
  sideText,
  children,
  size = 'default',
  variant,
}) {
  const titleLines = Array.isArray(title) ? title : [title];
  const sizeClass = `page-header--${size}`;
  const variantClass = variant ? ` page-header--${variant}` : '';
  const hasSideContent = sideItems.length > 0 || sideText;

  const renderSideItem = (item, index) => {
    const content = (
      <>
        <span className="page-header__side-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="page-header__side-item-label">{item.label}</span>
        {item.meta && <span className="page-header__side-meta">{item.meta}</span>}
        <span className="page-header__side-arrow" aria-hidden="true">
          →
        </span>
      </>
    );

    if (item.to) {
      return (
        <AppLink key={`${item.to}-${item.label}`} to={item.to} onClick={item.onClick}>
          {content}
        </AppLink>
      );
    }

    return (
      <a key={`${item.href}-${item.label}`} href={item.href} onClick={item.onClick}>
        {content}
      </a>
    );
  };

  return (
    <header
      className={`page-header ${sizeClass}${variantClass}`}
      data-animate-scope
      data-animate-default-stagger="150"
    >
      <div className={`page-header__inner${hasSideContent ? '' : ' page-header__inner--single'}`}>
        <div className="page-header__lead">
          {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}

          <h1>
            {titleLines.map((line, index) => (
              <div key={index} className="heading_line">
                <span
                  className={`page-header__heading-line ${index === 1 ? 'text-color-gradiant' : ''}`}
                  data-animate="slide-up-rotate"
                  data-animate-trigger="load"
                  data-animate-distance="150%"
                  data-animate-order={`${index}`}
                  style={{ textAlign: 'left' }}
                >
                  {line}
                </span>
              </div>
            ))}
          </h1>

          {subtitle && (
            <p
              className="page-header__subtitle"
              data-animate="fade-up"
              data-animate-trigger="load"
              data-animate-order="2"
            >
              {subtitle}
            </p>
          )}

          {children}
        </div>

        {hasSideContent && (
          <aside className="page-header__side hide-mobile-landscape" aria-label={sideLabel}>
            <div className="page-header__side-label">
              <span className="page-header__side-dot" aria-hidden="true" />
              {sideLabel}
            </div>
            {sideItems.length > 0 ? (
              <nav className="page-header__side-list">{sideItems.map(renderSideItem)}</nav>
            ) : (
              <p className="page-header__side-text">{sideText}</p>
            )}
          </aside>
        )}
      </div>

    </header>
  );
}
