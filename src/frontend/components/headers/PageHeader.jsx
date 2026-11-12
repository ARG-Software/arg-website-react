import { useLayoutEffect, useRef, useState } from 'react';
import { Breadcrumb } from '../navigation/Breadcrumb';
import AppLink from '../navigation/AppLink';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { HeroArt } from '../animated/HeroArt';

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
 * @param {string|string[]} props.title - Page title (string or array for multi-line titles; every line after the first is in the gradient)
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {Array} [props.breadcrumbs] - Optional breadcrumb items: { label: string, path?: string, isTag?: boolean }
 * @param {Array} [props.sideItems] - Optional links row: { label: string, href?: string, to?: string, meta?: string }
 * @param {string} [props.sideLabel] - Links row label
 * @param {React.ReactNode} [props.children] - Optional content pinned to the bottom of the header when there are no links (e.g., blog post meta)
 * @param {string} [props.size] - Header size class hook: 'default', 'large', 'small'
 * @param {React.ReactNode} [props.aside] - Optional content shown on the right in place of the decorative art (e.g., a project image)
 * @param {boolean} [props.animateAside] - Fades the aside in with the rest of the header
 * @param {string} [props.variant] - Optional visual variant
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  sideItems = [],
  sideLabel = 'On this page',
  children,
  size = 'default',
  variant,
  aside,
  animateAside = false,
  animate = true,
  animationTrigger = 'load',
}) {
  const titleLines = Array.isArray(title) ? title : [title];

  // The links stay on one row while they fit and switch to columns only when one would wrap
  const sideListRef = useRef(null);
  const [sideGrid, setSideGrid] = useState(false);
  useLayoutEffect(() => {
    const list = sideListRef.current;
    if (!list) return undefined;

    const measure = () => {
      const links = [...list.children];
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      const needed =
        links.reduce((sum, link) => sum + link.scrollWidth, 0) + gap * (links.length - 1);
      setSideGrid(needed > list.clientWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [sideItems.length]);
  const headerClass = [
    'page-header',
    SIZE_CLASSES[size] ?? SIZE_CLASSES.default,
    variant ? VARIANT_CLASSES[variant] : '',
    aside ? 'page-header--with-aside' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-trigger': animationTrigger,
        'data-animate-default-preset': 'fade-up',
      }
    : {};

  // The header reveals in its on-screen order: breadcrumb, title lines, subtitle, then links
  const itemAnimationAttrs = animate
    ? { 'data-animate': 'fade-up', 'data-animate-trigger': animationTrigger }
    : {};

  const renderSideItem = (item, index) => {
    const content = (
      <>
        <span className="page-header__side-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="page-header__side-item-label">{item.label}</span>
        {item.meta && <span className="page-header__side-meta">{item.meta}</span>}
        <span className="page-header__side-arrow arrow_icon-embed" aria-hidden="true">
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
          {...itemAnimationAttrs}
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
          {...itemAnimationAttrs}
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
        {...itemAnimationAttrs}
      >
        {content}
      </a>
    );
  };

  return (
    <header className={headerClass} {...scopeAttrs}>
      <div className="page-header__inner">
        {/* Fades in last, after the header text */}
        {!aside && (
          <div
            className="page-header__art"
            {...itemAnimationAttrs}
            data-animate-order={animate ? '1' : undefined}
          >
            <HeroArt className="page-header__art-canvas" />
          </div>
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} animate={animate} animationTrigger={animationTrigger} />
        )}

        <h1>
          {titleLines.map((line, index) => (
            <div key={index} className="heading_line">
              <span
                className={
                  index >= 1
                    ? 'page-header__heading-line text-color-gradiant'
                    : 'page-header__heading-line'
                }
                data-animate={animate ? 'slide-up-rotate' : undefined}
                data-animate-trigger={animate ? animationTrigger : undefined}
                data-animate-distance={animate ? '150%' : undefined}
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
          >
            {subtitle}
          </p>
        )}

        {/* Beside the title on wide screens, under the subtitle on narrow ones */}
        {aside && (
          <div className="page-header__aside" {...(animateAside ? itemAnimationAttrs : {})}>
            {aside}
          </div>
        )}

        {sideItems.length > 0 && (
          <div className="page-header__row page-header__row--links">
            <div className="page-header__side-label" {...itemAnimationAttrs}>
              <span className="page-header__side-dot" aria-hidden="true" />
              {sideLabel}
            </div>
            <nav
              ref={sideListRef}
              className={`page-header__side-list${sideGrid ? ' page-header__side-list--grid' : ''}`}
              aria-label={sideLabel}
            >
              {sideItems.map(renderSideItem)}
            </nav>
          </div>
        )}

        {sideItems.length === 0 && children && <div className="page-header__row">{children}</div>}
      </div>
    </header>
  );
}
