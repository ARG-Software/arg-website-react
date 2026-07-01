import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import AppLink from './AppLink';
import { Logo } from '../icons/Logo';
import { trackEvent, trackCTA } from '../../utils/analytics';
import { loadBlogPostsMetadata } from '../../utils/blog';
import { arrowSvg } from '../icons/SocialIcons';
import { getExternalLink, EXTERNAL_LINK_KEYS } from '../../services/linksservice';
import projects from '../../data/projects.json';
import menuConfig from '../../data/menu.json';

function getRotationSeed(seedMode) {
  if (seedMode === 'session') {
    if (!window.__navMenuRotationSeed) {
      window.__navMenuRotationSeed = Math.floor(Math.random() * 1_000_000);
    }
    return window.__navMenuRotationSeed;
  }

  const now = new Date();
  return now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
}

function pickFeaturedProjects(count, seed) {
  if (!Array.isArray(projects) || projects.length === 0) return [];
  if (count >= projects.length) return [...projects];

  const start = ((seed % projects.length) + projects.length) % projects.length;
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(projects[(start + i) % projects.length]);
  }
  return result;
}

function getProjectMeta(project, labelMap) {
  if (!project) return { category: '' };
  const fromMap = labelMap && project.slug ? labelMap[project.slug] : null;
  return {
    category: fromMap || project.subtitle || project.client || '',
  };
}

function resolveCtaHref(target) {
  if (!target) return '#';
  if (target.startsWith('http') || target.startsWith('/') || target.startsWith('mailto:')) {
    return target;
  }
  return getExternalLink(target) || getExternalLink(EXTERNAL_LINK_KEYS.PROJECT_BOOKING);
}

function ArrowIcon({ className = '' }) {
  return <span className={`arrow_icon-embed ${className}`.trim()}>{arrowSvg}</span>;
}

export function NavMenu({ isOpen, isClosing, onClose }) {
  const [latestPost, setLatestPost] = useState(null);
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  const { primary, selectedWork, company, latest, cta } = menuConfig;

  const featuredProjects = useMemo(() => {
    const count = selectedWork?.desktopCount ?? 4;
    const seed = getRotationSeed(selectedWork?.rotationSeed);
    return pickFeaturedProjects(count, seed);
  }, [selectedWork?.desktopCount, selectedWork?.rotationSeed]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    gsap.set(wrapperRef.current, { autoAlpha: 0 });
    gsap.set(containerRef.current, { xPercent: 100 });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    trackEvent('nav_menu_open', {});
    gsap.killTweensOf([wrapperRef.current, containerRef.current]);
    gsap.to(wrapperRef.current, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    gsap.to(containerRef.current, { xPercent: 0, duration: 0.65, ease: 'expo.out' });
  }, [isOpen]);

  useEffect(() => {
    if (!isClosing) return;
    trackEvent('nav_menu_close', {});
    gsap.killTweensOf([wrapperRef.current, containerRef.current]);
    gsap.to(containerRef.current, { xPercent: 100, duration: 0.5, ease: 'expo.in' });
    gsap.to(wrapperRef.current, { autoAlpha: 0, duration: 0.4, delay: 0.2, ease: 'power2.in' });
  }, [isClosing]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      try {
        const posts = loadBlogPostsMetadata();
        if (posts && posts.length > 0) setLatestPost(posts[0]);
      } catch (err) {
        console.error('Failed to load latest blog post:', err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && !isClosing) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen, isClosing]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = e => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const handleLinkClick = handleClose;

  const handleCtaClick = useCallback(() => {
    trackCTA(cta?.eventName || 'book_meeting', cta?.location || 'nav_menu');
  }, [cta?.eventName, cta?.location]);

  const ctaHref = useMemo(() => resolveCtaHref(cta?.to), [cta?.to]);

  const latestDate = latestPost
    ? new Date(latestPost.date).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const latestTag = latestPost
    ? [latestPost.tag || 'Engineering', latestDate].filter(Boolean).join(' · ')
    : null;

  return (
    <div ref={wrapperRef} className={`nav-menu${isOpen ? ' is-open' : ''}`} onClick={handleClose}>
      <div
        ref={containerRef}
        className="nav-menu__container"
        onClick={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}
      >
        <aside className="nav-menu__left" aria-label="Latest update">
          <span className="nav-menu__left-label">{latest?.label || 'Latest'}</span>

          {latestPost ? (
            <AppLink
              to={`/blog/${latestPost.slug}/`}
              className="nav-menu__article-link"
              onClick={handleLinkClick}
            >
              {latestTag && <span className="nav-menu__article-tag">{latestTag}</span>}
              <h3>{latestPost.title}</h3>
              <div className="nav-menu__article-meta">
                {latestPost.readTime && <span>{latestPost.readTime}</span>}
                <span className="arrow_icon-embed nav-menu__article-arrow" aria-hidden="true">
                  {arrowSvg}
                </span>
              </div>

              {latestPost.image && (
                <span className="nav-menu__article-image-wrap">
                  <img src={latestPost.image} alt="" className="nav-menu__article-image" />
                </span>
              )}
            </AppLink>
          ) : (
            <div className="nav-menu__article-link nav-menu__article-link--placeholder">
              <span className="nav-menu__article-tag">Engineering</span>
              <h3>Stay tuned for the latest write-up</h3>
            </div>
          )}

          <div className="nav-menu__ai-line">
            <p>{latest?.aiTitle || 'ARG AI — coming soon'}</p>
            <span className="nav-menu__ai-tag">{latest?.aiTag || 'In development'}</span>
          </div>
        </aside>

        <main className="nav-menu__right" aria-label="Menu">
          <header className="nav-menu__head">
            <AppLink
              to="/"
              aria-label="Arg Software"
              className="nav-menu__logo"
              onClick={handleLinkClick}
            >
              <Logo />
            </AppLink>

            <button
              className="nav-menu__close"
              onClick={handleClose}
              aria-label="Close menu"
              type="button"
            >
              <span className="nav-menu__close-text">Close</span>
              <span className="nav-menu__close-icon" aria-hidden="true">
                ×
              </span>
            </button>
          </header>

          <div className="nav-menu__body">
            <nav className="nav-menu__primary" aria-label="Pages">
              <span className="nav-menu__group-label">Pages</span>

              {primary.map(item => (
                <AppLink
                  key={item.label}
                  to={item.to}
                  className="nav-menu__primary-link"
                  onClick={handleLinkClick}
                >
                  <span className="nav-menu__primary-label">
                    <span className="nav-menu__primary-name">{item.label}</span>
                    {item.openInPage && (
                      <span className="arrow_icon-embed nav-menu__primary-arrow" aria-hidden="true">
                        {arrowSvg}
                      </span>
                    )}
                  </span>
                  {item.description && (
                    <span className="nav-menu__primary-desc">{item.description}</span>
                  )}
                </AppLink>
              ))}
            </nav>

            <div className="nav-menu__rail" aria-label="Menu rail">
              <section
                className="nav-menu__group"
                aria-label={selectedWork?.label || 'Selected work'}
              >
                <span className="nav-menu__group-label">
                  {selectedWork?.label || 'Selected work'}
                </span>
                <div className="nav-menu__work" role="list">
                  {featuredProjects.map(project => {
                    const meta = getProjectMeta(project, selectedWork?.projectLabels);
                    return (
                      <AppLink
                        key={project.slug}
                        to={`/projects/${project.slug}/`}
                        className="nav-menu__work-link"
                        onClick={handleLinkClick}
                        role="listitem"
                      >
                        <span className="nav-menu__work-name">{project.title}</span>
                        {meta.category && (
                          <span className="nav-menu__work-meta">{meta.category}</span>
                        )}
                        <span className="arrow_icon-embed nav-menu__work-arrow" aria-hidden="true">
                          {arrowSvg}
                        </span>
                      </AppLink>
                    );
                  })}
                </div>
                {selectedWork?.viewAllTo && (
                  <AppLink
                    to={selectedWork.viewAllTo}
                    className="nav-menu__viewall"
                    onClick={handleLinkClick}
                  >
                    <span>{selectedWork.viewAllLabel || 'All projects'}</span>
                    <span className="arrow_icon-embed nav-menu__viewall-arrow" aria-hidden="true">
                      {arrowSvg}
                    </span>
                  </AppLink>
                )}
              </section>

              <section className="nav-menu__group" aria-label={company?.label || 'Company'}>
                <span className="nav-menu__group-label">{company?.label || 'Company'}</span>
                <div className="nav-menu__company">
                  {company?.items?.map(item => (
                    <AppLink
                      key={item.label}
                      to={item.to}
                      className="nav-menu__company-pill"
                      onClick={handleLinkClick}
                    >
                      <span>{item.label}</span>
                      {item.openInPage && (
                        <span
                          className="arrow_icon-embed nav-menu__company-arrow"
                          aria-hidden="true"
                        >
                          {arrowSvg}
                        </span>
                      )}
                    </AppLink>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <footer className="nav-menu__foot">
            {cta?.tagline && <span className="nav-menu__tagline">{cta.tagline}</span>}
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-menu__cta"
              onClick={handleCtaClick}
            >
              <span>{cta?.label || 'Book a meeting'}</span>
              <ArrowIcon className="nav-menu__cta-arrow" />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
