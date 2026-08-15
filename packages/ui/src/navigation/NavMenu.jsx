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
  company,
  latestPost,
  latest,
  ctaHref = '#',
  ctaLabel = 'Book a meeting',
  preview = false,
  onClose,
  onContainerClick,
  onCtaClick,
  onAssistantClick,
  renderLink = defaultRenderLink,
  renderLatestLink = defaultRenderLink,
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
            'aria-label': 'Arg Software',
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
          <div className="nav-menu__utility-row">
            <span className="nav-menu__utility-label">{labels.featured || 'Featured'}</span>
            {featuredProjects.map((project, idx) => (
              <span key={project.slug}>
                {renderLink({
                  to: project.to || project.path || `/${project.slug}/`,
                  className: 'nav-menu__utility-link',
                  children: project.title,
                })}
                {idx < featuredProjects.length - 1 && (
                  <span className="nav-menu__sep">&middot;</span>
                )}
              </span>
            ))}
            {selectedWork?.viewAllTo && (
              <>
                <span className="nav-menu__sep">&middot;</span>
                {renderLink({
                  to: selectedWork.viewAllTo,
                  className: 'nav-menu__utility-link nav-menu__utility-link--all-work',
                  children: (
                    <>
                      <span>{selectedWork.viewAllLabel || 'All work'}</span>
                      <span className="nav-menu__utility-arrow-symbol" aria-hidden="true">
                        &#8599;
                      </span>
                    </>
                  ),
                })}
              </>
            )}
          </div>

          <div className="nav-menu__utility-row nav-menu__utility-row--company">
            <span className="nav-menu__utility-label">{labels.secondary || 'More'}</span>
            {company?.items?.map((item, idx) => (
              <span key={item.label}>
                {renderLink({
                  to: item.to,
                  className: 'nav-menu__utility-link',
                  children: item.label,
                })}
                {idx < company.items.length - 1 && <span className="nav-menu__sep">&middot;</span>}
              </span>
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
