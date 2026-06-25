import { Breadcrumb } from '../navigation/Breadcrumb';
import AppLink from '../navigation/AppLink';
import { arrowSvg } from '../icons/SocialIcons';

const SIZE_CLASSES = {
  default: '',
  large: 'page-header--large',
  small: 'page-header--small',
};

const VARIANT_CLASSES = {
  article: 'page-header--article',
  'article bp-article-page-header': 'page-header--article bp-article-page-header',
};

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
  animate = true,
  animationTrigger = 'load',
  animationStagger = 150,
}) {
  const titleLines = Array.isArray(title) ? title : [title];
  const headerClass = [
    'page-header',
    SIZE_CLASSES[size] ?? SIZE_CLASSES.default,
    variant ? VARIANT_CLASSES[variant] : '',
  ]
    .filter(Boolean)
    .join(' ');
  const hasSideContent = sideItems.length > 0 || sideText;
  const innerClass = hasSideContent
    ? 'page-header__inner'
    : 'page-header__inner page-header__inner--single';

  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-trigger': animationTrigger,
        'data-animate-default-preset': 'fade-up',
        'data-animate-default-stagger': String(animationStagger),
      }
    : {};

  const itemAnimationAttrs = order =>
    animate
      ? {
          'data-animate': 'fade-up',
          'data-animate-trigger': animationTrigger,
          'data-animate-order': String(order),
        }
      : {};

  const renderSideItem = (item, index) => {
    const content = (
      <>
        <span className="page-header__side-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="page-header__side-item-label">{item.label}</span>
        {item.meta && <span className="page-header__side-meta">{item.meta}</span>}
        <span className="page-header__side-arrow arrow_icon-embed w-embed" aria-hidden="true">
          {arrowSvg}
        </span>
      </>
    );

    if (item.to) {
      return (
        <AppLink
          key={`${item.to}-${item.label}`}
          to={item.to}
          onClick={item.onClick}
          {...itemAnimationAttrs(index + 4)}
        >
          {content}
        </AppLink>
      );
    }

    if (item.href?.startsWith('#')) {
      return (
        <AppLink
          key={`${item.href}-${item.label}`}
          to={item.href}
          onClick={item.onClick}
          {...itemAnimationAttrs(index + 4)}
        >
          {content}
        </AppLink>
      );
    }

    return (
      <a
        key={`${item.href}-${item.label}`}
        href={item.href}
        onClick={item.onClick}
        {...itemAnimationAttrs(index + 4)}
      >
        {content}
      </a>
    );
  };

  return (
    <header className={headerClass} {...scopeAttrs}>
      <div className={innerClass}>
        <div className="page-header__lead">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb items={breadcrumbs} animate={animate} animationTrigger={animationTrigger} />
          )}

          <h1>
            {titleLines.map((line, index) => (
              <div key={index} className="heading_line">
                <span
                  className={
                    index === 1
                      ? 'page-header__heading-line text-color-gradiant'
                      : 'page-header__heading-line'
                  }
                  data-animate={animate ? 'slide-up-rotate' : undefined}
                  data-animate-trigger={animate ? animationTrigger : undefined}
                  data-animate-distance={animate ? '150%' : undefined}
                  data-animate-order={animate ? `${index}` : undefined}
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
              data-animate={animate ? 'fade-up' : undefined}
              data-animate-trigger={animate ? animationTrigger : undefined}
              data-animate-order={animate ? '2' : undefined}
            >
              {subtitle}
            </p>
          )}

          {children}
        </div>

        {hasSideContent && (
          <aside className="page-header__side hide-mobile-landscape" aria-label={sideLabel}>
            <div className="page-header__side-label" {...itemAnimationAttrs(3)}>
              <span className="page-header__side-dot" aria-hidden="true" />
              {sideLabel}
            </div>
            {sideItems.length > 0 ? (
              <nav className="page-header__side-list">{sideItems.map(renderSideItem)}</nav>
            ) : (
              <p className="page-header__side-text" {...itemAnimationAttrs(4)}>
                {sideText}
              </p>
            )}
          </aside>
        )}
      </div>
    </header>
  );
}
