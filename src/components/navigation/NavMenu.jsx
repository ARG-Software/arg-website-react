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

function resolveCtaHref(target) {
  if (!target) return '#';
  if (target.startsWith('http') || target.startsWith('/') || target.startsWith('mailto:')) {
    return target;
  }
  return getExternalLink(target) || getExternalLink(EXTERNAL_LINK_KEYS.PROJECT_BOOKING);
}

function ArrowIcon({ className = '' }) {
  return <span className={`nav-menu__arrow ${className}`.trim()}>{arrowSvg}</span>;
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

  return (
    <div ref={wrapperRef} className={`nav-menu${isOpen ? ' is-open' : ''}`} onClick={handleClose}>
      <div
        ref={containerRef}
        className="nav-menu__container"
        onClick={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}
      >
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
            {primary.map(item => (
              <AppLink
                key={item.label}
                to={item.to}
                className="nav-menu__primary-link"
                onClick={handleLinkClick}
              >
                <span className="nav-menu__primary-name">{item.label}</span>
                {item.openInPage && <ArrowIcon className="nav-menu__primary-arrow" />}
              </AppLink>
            ))}
          </nav>
        </div>

        <div className="nav-menu__utilities">
          <div className="nav-menu__utility-row">
            <span className="nav-menu__utility-label">Our Work</span>
            {featuredProjects.map((project, idx) => (
              <span key={project.slug}>
                <AppLink
                  to={`/projects/${project.slug}/`}
                  className="nav-menu__utility-link"
                  onClick={handleLinkClick}
                >
                  {project.title}
                </AppLink>
                {idx < featuredProjects.length - 1 && <span className="nav-menu__sep">·</span>}
              </span>
            ))}
            {selectedWork?.viewAllTo && (
              <>
                <span className="nav-menu__sep">·</span>
                <AppLink
                  to={selectedWork.viewAllTo}
                  className="nav-menu__utility-link nav-menu__utility-link--all-work"
                  onClick={handleLinkClick}
                >
                  <span>{selectedWork.viewAllLabel || 'All work'}</span>
                  <span className="nav-menu__utility-arrow-symbol" aria-hidden="true">
                    ↗
                  </span>
                </AppLink>
              </>
            )}
          </div>

          <div className="nav-menu__utility-row nav-menu__utility-row--company">
            <span className="nav-menu__utility-label">Company</span>
            {company?.items?.map((item, idx) => (
              <span key={item.label}>
                <AppLink to={item.to} className="nav-menu__utility-link" onClick={handleLinkClick}>
                  {item.label}
                </AppLink>
                {idx < company.items.length - 1 && <span className="nav-menu__sep">·</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="nav-menu__ribbon">
          {latestPost ? (
            <AppLink
              to={`/blog/${latestPost.slug}/`}
              className="nav-menu__latest"
              onClick={handleLinkClick}
            >
              {latestPost.image && (
                <span className="nav-menu__latest-thumb">
                  <img src={latestPost.image} alt="" />
                </span>
              )}
              <div className="nav-menu__latest-content">
                <span className="nav-menu__latest-label">
                  Latest on the blog · {latestPost.tag || 'AI'}
                </span>
                <span className="nav-menu__latest-title">{latestPost.title}</span>
              </div>
            </AppLink>
          ) : (
            <div className="nav-menu__latest nav-menu__latest--placeholder">
              <span className="nav-menu__latest-thumb"></span>
              <div className="nav-menu__latest-content">
                <span className="nav-menu__latest-label">Latest on the blog</span>
                <span className="nav-menu__latest-title">Stay tuned for updates</span>
              </div>
            </div>
          )}

          <div className="nav-menu__ai-chip">
            <span className="nav-menu__ai-dot"></span>
            {latest?.aiTitle || 'ARG AI · Coming soon'}
          </div>

          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-menu__cta"
            onClick={handleCtaClick}
          >
            {cta?.label || 'Book a meeting'}
            <ArrowIcon className="nav-menu__cta-arrow" />
          </a>
        </div>
      </div>
    </div>
  );
}
