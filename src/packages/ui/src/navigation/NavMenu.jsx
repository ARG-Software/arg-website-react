import { arrowSvg } from '../icons/SocialIcons.jsx';

function ArrowIcon({ className = '' }) {
  return <span className={`nav-menu__arrow ${className}`.trim()}>{arrowSvg}</span>;
}

export function NavMenu({
  wrapperRef,
  containerRef,
  isOpen = false,
  logo,
  primary = [],
  featuredProjects = [],
  selectedWork,
  groups = [],
  auditInstall,
  latestPost,
  latest,
  ctaHref = '#',
  ctaLabel = 'Book a meeting',
  preview = false,
  onClose,
  onContainerClick,
  onCtaClick,
  onAuditClick,
  onAssistantClick,
  renderLink = defaultRenderLink,
  renderLatestLink = defaultRenderLink,
  renderAuditLink = defaultRenderLink,
  labels = {},
}) {
  const handleContainerClick = event => {
    event.stopPropagation();
    onContainerClick?.(event);
  };

  return (
    <div
      ref={wrapperRef}
      className={`nav-menu${isOpen ? ' is-open' : ''}${preview ? ' nav-menu--preview' : ''}`}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="nav-menu__container"
        onClick={handleContainerClick}
        onWheel={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}
      >
        <header className="nav-menu__head">
          {renderLink({
            to: '/',
            className: 'nav-menu__logo',
            children: logo,
            'aria-label': 'ARG Software',
          })}

          <button
            className="nav-menu__close"
            onClick={onClose}
            aria-label="Close menu"
            type="button"
          >
            <span className="nav-menu__close-text">Close</span>
            <span className="nav-menu__close-icon" aria-hidden="true">
              &times;
            </span>
          </button>
        </header>

        <div className="nav-menu__body">
          <nav className="nav-menu__primary" aria-label="Pages">
            {primary.map(item =>
              renderLink({
                key: item.label,
                to: item.to,
                className: 'nav-menu__primary-link',
                children: (
                  <>
                    <span className="nav-menu__primary-name">{item.label}</span>
                    {item.openInPage && <ArrowIcon className="nav-menu__primary-arrow" />}
                  </>
                ),
              })
            )}
          </nav>
        </div>

        <div className="nav-menu__utilities">
          <div className="nav-menu__columns">
            <div className="nav-menu__column">
              <span className="nav-menu__utility-label">
                {selectedWork?.label || labels.featured || 'Featured'}
              </span>
              {featuredProjects.map(project =>
                renderLink({
                  key: project.slug,
                  to: project.to || project.path || `/${project.slug}/`,
                  className: 'nav-menu__utility-link',
                  children: project.title,
                })
              )}
              {selectedWork?.viewAllTo &&
                renderLink({
                  to: selectedWork.viewAllTo,
                  className: 'nav-menu__utility-link',
                  children: selectedWork.viewAllLabel || 'All work',
                })}
            </div>

            {groups.map(group => (
              <div key={group.label} className="nav-menu__column">
                <span className="nav-menu__utility-label">{group.label}</span>
                {group.items.map(item =>
                  renderLink({
                    key: item.label,
                    to: item.to,
                    className: 'nav-menu__utility-link',
                    children: item.label,
                  })
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="nav-menu__ribbon">
          {latestPost ? (
            renderLatestLink({
              to: latestPost.to || latestPost.path || `/${latestPost.slug}/`,
              className: 'nav-menu__latest',
              children: (
                <>
                  {latestPost.image && (
                    <span className="nav-menu__latest-thumb">
                      <img src={latestPost.image} alt="" />
                    </span>
                  )}
                  <div className="nav-menu__latest-content">
                    <span className="nav-menu__latest-label">
                      {labels.latest || 'Latest update'} · {latestPost.tag || 'Featured'}
                    </span>
                    <span className="nav-menu__latest-title">{latestPost.title}</span>
                  </div>
                </>
              ),
            })
          ) : (
            <div className="nav-menu__latest nav-menu__latest--placeholder">
              <span className="nav-menu__latest-thumb"></span>
              <div className="nav-menu__latest-content">
                <span className="nav-menu__latest-label">{labels.latest || 'Latest update'}</span>
                <span className="nav-menu__latest-title">
                  {labels.latestPlaceholder || 'Stay tuned for updates'}
                </span>
              </div>
            </div>
          )}

          {auditInstall &&
            renderAuditLink({
              to: auditInstall.to,
              className: 'nav-menu__ai-chip nav-menu__audit-chip',
              onClick: onAuditClick,
              children: (
                <>
                  <span className="nav-menu__audit-dot" aria-hidden="true" />
                  {auditInstall.label}
                </>
              ),
            })}

          <button className="nav-menu__ai-chip" type="button" onClick={onAssistantClick}>
            <span className="nav-menu__ai-dot"></span>
            {latest?.aiTitle || labels.assistant || 'Open assistant'}
          </button>

          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-menu__cta"
            onClick={onCtaClick}
          >
            {ctaLabel}
            <ArrowIcon className="nav-menu__cta-arrow" />
          </a>
        </div>
      </div>
    </div>
  );
}

function defaultRenderLink({ key, to, className, children, ...props }) {
  return (
    <a key={key || to} href={to} className={className} {...props}>
      {children}
    </a>
  );
}
