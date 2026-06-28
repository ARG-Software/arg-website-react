import { useEffect, useState, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import AppLink from './AppLink';
import { Logo } from '../icons/Logo';
import { trackEvent } from '../../hooks/useAnalytics';
import { loadBlogPostsMetadata } from '../../utils/blog';
import { arrowSvg } from '../icons/SocialIcons';
import { PillButton } from '../pills/Pill';
import projects from '../../data/projects.json';

const primaryMenuItems = [
  {
    label: 'Partners',
    to: '/#partners',
    detailLabel: 'Full overview',
    detailTo: '/partners/',
  },
  {
    label: 'Services',
    to: '/#services',
  },
  {
    label: 'Use Cases',
    to: '/#cases',
    projectLinks: projects.map(project => ({
      label: project.title,
      to: `/projects/${project.slug}/`,
    })),
  },
  {
    label: 'Working with Us',
    to: '/#working-with-us',
    detailLabel: 'Full overview',
    detailTo: '/working-with-us/',
  },
  {
    label: 'Blog',
    to: '/#blog-promo',
    detailLabel: 'All articles',
    detailTo: '/blog/',
  },
  {
    label: 'About',
    to: '/#about',
  },
];

const secondaryMenuItems = [
  { label: 'Testimonials', to: '/#testimonials' },
  { label: 'Meet our Team', to: '/#team' },
  { label: 'Careers', to: '/careers/' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Social', to: '/#social' },
  { label: 'Contact', to: '/contact/' },
];

const USE_CASES_PANEL_ID = 'nav-overlay-use-cases';

function ArrowIcon({ className = '' }) {
  return <span className={`arrow_icon-embed ${className}`.trim()}>{arrowSvg}</span>;
}

export function NavMenu({ isOpen, isClosing, onClose }) {
  const [latestPost, setLatestPost] = useState(null);
  const [isUseCasesOpen, setIsUseCasesOpen] = useState(false);
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  const handleClose = useCallback(() => {
    setIsUseCasesOpen(false);
    onClose();
  }, [onClose]);

  // Set initial hidden state (GSAP owns opacity/visibility from here on)
  useEffect(() => {
    gsap.set(wrapperRef.current, { autoAlpha: 0 });
    gsap.set(containerRef.current, { xPercent: 100 });
  }, []);

  // Open: fade backdrop in, slide container from right
  useEffect(() => {
    if (!isOpen) return;
    trackEvent('nav_menu_open', {});
    gsap.killTweensOf([wrapperRef.current, containerRef.current]);
    gsap.to(wrapperRef.current, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    gsap.to(containerRef.current, { xPercent: 0, duration: 0.65, ease: 'expo.out' });
  }, [isOpen]);

  // Close: slide container out to right, then fade backdrop out
  useEffect(() => {
    if (!isClosing) return;
    trackEvent('nav_menu_close', {});
    gsap.killTweensOf([wrapperRef.current, containerRef.current]);
    gsap.to(containerRef.current, { xPercent: 100, duration: 0.5, ease: 'expo.in' });
    gsap.to(wrapperRef.current, { autoAlpha: 0, duration: 0.4, delay: 0.2, ease: 'power2.in' });
  }, [isClosing]);

  // Load latest blog post when overlay opens
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

  // Lock the page behind the overlay; the menu owns scrolling while active.
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

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = e => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const handleLinkClick = handleClose;
  const handleUseCasesToggle = useCallback(() => {
    setIsUseCasesOpen(current => !current);
  }, []);

  const latestDate = latestPost
    ? new Date(latestPost.date).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div
      ref={wrapperRef}
      className={`nav_overlay-wrapper${isOpen ? ' active' : ''}`}
      onClick={handleClose}
    >
      <div
        ref={containerRef}
        className="nav_overlay-container"
        onClick={event => event.stopPropagation()}
        onWheel={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}
      >
        <aside className="nav_overlay-left" aria-label="Latest update">
          <span className="nav_overlay-left-label">Latest</span>

          {latestPost && (
            <AppLink
              to={`/blog/${latestPost.slug}/`}
              className="nav_overlay-article-link"
              onClick={handleLinkClick}
            >
              <span className="nav_overlay-article-tag">
                {latestPost.tag || 'Engineering'} {latestDate ? `· ${latestDate}` : ''}
              </span>
              <h3>{latestPost.title}</h3>
              <div className="nav_overlay-article-meta">
                {latestPost.readTime && <span>{latestPost.readTime}</span>}
                <span className="nav_overlay-article-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              {latestPost.image && (
                <span className="nav_overlay-article-image-wrap">
                  <img src={latestPost.image} alt="" className="nav_overlay-article-image" />
                </span>
              )}
            </AppLink>
          )}

          <div className="nav_overlay-ai-line">
            <p>ARG AI - Coming Soon</p>
            <span>In development</span>
          </div>
        </aside>

        <main className="nav_overlay-right" aria-label="Menu">
          <header className="nav_overlay-right-head">
            <AppLink
              to="/"
              aria-label="Arg Software"
              className="nav_overlay-logo"
              onClick={handleLinkClick}
            >
              <Logo />
            </AppLink>

            <button className="nav_overlay-close" onClick={handleClose} aria-label="Close menu">
              <span>Close</span>
              <span className="nav_overlay-close-icon" aria-hidden="true">
                ×
              </span>
            </button>
          </header>

          <nav className="nav_overlay-nav" aria-label="Main">
            {primaryMenuItems.map(item => (
              <div key={item.label} className="nav_overlay-nav-item">
                <div className="nav_overlay-nav-row">
                  <AppLink to={item.to} className="nav_overlay-nav-label" onClick={handleLinkClick}>
                    {item.label}
                  </AppLink>
                  {item.projectLinks ? (
                    <button
                      type="button"
                      className="nav_overlay-nav-detail nav_overlay-nav-detail--strong"
                      aria-expanded={isUseCasesOpen}
                      aria-controls={USE_CASES_PANEL_ID}
                      onClick={handleUseCasesToggle}
                    >
                      Use case pages
                      <span aria-hidden="true">{isUseCasesOpen ? '↑' : '↓'}</span>
                    </button>
                  ) : item.detailTo ? (
                    <AppLink
                      to={item.detailTo}
                      className="nav_overlay-nav-detail nav_overlay-nav-detail--strong"
                      onClick={handleLinkClick}
                    >
                      {item.detailLabel}
                      <span aria-hidden="true">↗</span>
                    </AppLink>
                  ) : null}
                </div>

                {item.projectLinks && (
                  <div
                    id={USE_CASES_PANEL_ID}
                    className="nav_overlay-project-pills"
                    aria-label="Use case pages"
                    hidden={!isUseCasesOpen}
                  >
                    {item.projectLinks.map(project => (
                      <PillButton
                        as={AppLink}
                        key={project.to}
                        to={project.to}
                        className="nav_overlay-project-pill nav_overlay-project-pill--subtle"
                        variant="outline"
                        size="xs"
                        onClick={handleLinkClick}
                        iconAfter={<ArrowIcon className="nav_overlay-project-pill-arrow" />}
                      >
                        {project.label}
                      </PillButton>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="nav_overlay-secondary" aria-label="Secondary menu">
            {secondaryMenuItems.map(item => (
              <AppLink key={item.to} to={item.to} onClick={handleLinkClick}>
                {item.label}
              </AppLink>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
