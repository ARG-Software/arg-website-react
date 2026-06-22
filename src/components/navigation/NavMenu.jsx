import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import AppLink from './AppLink';
import { Logo } from '../icons/Logo';
import { trackCTA, trackEvent } from '../../hooks/useAnalytics';
import { loadBlogPostsMetadata } from '../../utils/blog';
import { arrowSvg } from '../icons/SocialIcons';
import PROJECTS from '../../data/projects.json';

const menuItems = [
  { to: '/#about', label: 'About' },
  { to: '/#contact', label: 'Contact' },
  { to: '/#services', label: 'Services' },
  { to: '/#social', label: 'Social' },
  { to: '/#testimonials', label: 'Testimonials' },
  { to: '/projects/', label: 'Use Cases', isUseCases: true },
  { to: '/work-with-us/', label: 'Working with Us' },
];

const chevronSvg = (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function NavMenu({ isOpen, isClosing, onClose }) {
  const [latestPost, setLatestPost] = useState(null);
  const [useCasesOpen, setUseCasesOpen] = useState(false);
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

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

  // Reset accordion when menu closes
  useLayoutEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseCasesOpen(false);
    }
  }, [isOpen]);

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

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleLinkClick = useCallback(() => onClose(), [onClose]);

  const toggleUseCases = useCallback(e => {
    e.stopPropagation();
    e.preventDefault();
    setUseCasesOpen(prev => {
      const next = !prev;
      trackEvent('nav_use_cases_toggle', { action: next ? 'open' : 'close' });
      return next;
    });
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
      onClick={onClose}
    >
      <div ref={containerRef} className="nav_overlay-container" onClick={e => e.stopPropagation()}>
        <button className="nav_overlay-close" onClick={onClose} aria-label="Close menu">
          ×
        </button>

        {/* Left: transparent panel with latest post card at bottom */}
        <div className="nav_overlay-aside">
          {latestPost && (
            <div className="nav_overlay-latest">
              <span className="nav_overlay-latest-label">Latest update</span>
              <div className="nav_overlay-latest-img-wrap">
                <img
                  src={latestPost.image}
                  alt={latestPost.title}
                  className="nav_overlay-latest-img"
                />
              </div>
              {latestDate && <div className="nav_overlay-latest-date">{latestDate}</div>}
              <AppLink
                to={`/blog/${latestPost.slug}/`}
                className="nav_overlay-latest-post-title"
                onClick={handleLinkClick}
              >
                {latestPost.title}
              </AppLink>
            </div>
          )}
        </div>

        {/* Right: logo + nav links + CTAs */}
        <div className="nav_overlay-main">
          {/* Logo at the top of the right panel */}
          <div className="nav_overlay-main-logo">
            <Logo />
          </div>

          <nav className="nav_overlay-nav">
            {menuItems.map(item =>
              item.isUseCases ? (
                <div key={item.to} className="nav_overlay-nav-item">
                  <div className="nav_overlay-usecases-toggle">
                    <AppLink
                      to={item.to}
                      className="nav_overlay-nav-link"
                      onClick={handleLinkClick}
                    >
                      {item.label}
                    </AppLink>
                    <button
                      className={`nav_overlay-usecases-chevron${useCasesOpen ? ' is-open' : ''}`}
                      onClick={toggleUseCases}
                      aria-label={useCasesOpen ? 'Collapse use cases' : 'Expand use cases'}
                      aria-expanded={useCasesOpen}
                    >
                      {chevronSvg}
                    </button>
                  </div>
                  <div
                    className={`nav_overlay-usecases-list${useCasesOpen ? ' is-open' : ''}`}
                    aria-hidden={!useCasesOpen}
                  >
                    {PROJECTS.map(project => (
                      <AppLink
                        key={project.slug}
                        to={`/projects/${project.slug}/`}
                        className="nav_overlay-usecases-item"
                        onClick={handleLinkClick}
                      >
                        {project.title}
                      </AppLink>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={item.to} className="nav_overlay-nav-item">
                  <AppLink to={item.to} className="nav_overlay-nav-link" onClick={handleLinkClick}>
                    {item.label}
                  </AppLink>
                </div>
              )
            )}
          </nav>

          {/* Latest post — visible only on mobile (aside hidden ≤991px) */}
          {latestPost && (
            <div className="nav_overlay-latest-mobile">
              <div className="nav_overlay-latest-mobile-img-wrap">
                <img
                  src={latestPost.image}
                  alt={latestPost.title}
                  className="nav_overlay-latest-mobile-img"
                />
              </div>
              <div className="nav_overlay-latest-mobile-text">
                <span className="nav_overlay-latest-label">Latest update</span>
                {latestDate && <div className="nav_overlay-latest-date">{latestDate}</div>}
                <AppLink
                  to={`/blog/${latestPost.slug}/`}
                  className="nav_overlay-latest-post-title"
                  onClick={handleLinkClick}
                >
                  {latestPost.title}
                </AppLink>
              </div>
            </div>
          )}

          {/* Bottom CTA row */}
          <div className="nav_overlay-ctas">
            <AppLink to="/blog/" className="nav_overlay-cta" onClick={handleLinkClick}>
              <span>Blog</span>
              <span className="nav_overlay-cta-arrow">
                <span className="arrow_icon-embed w-embed">{arrowSvg}</span>
              </span>
            </AppLink>
            <AppLink to="/partners/" className="nav_overlay-cta" onClick={handleLinkClick}>
              <span>Partners</span>
              <span className="nav_overlay-cta-arrow">
                <span className="arrow_icon-embed w-embed">{arrowSvg}</span>
              </span>
            </AppLink>
            <AppLink to="/careers/" className="nav_overlay-cta" onClick={handleLinkClick}>
              <span>Careers</span>
              <span className="nav_overlay-cta-arrow">
                <span className="arrow_icon-embed w-embed">{arrowSvg}</span>
              </span>
            </AppLink>
            <a
              href="https://zcal.co/argsoftware/project"
              target="_blank"
              rel="noopener noreferrer"
              className="nav_overlay-cta"
              onClick={() => {
                trackCTA('book_meeting', 'overlay');
                handleLinkClick();
              }}
            >
              <span>Book Meeting</span>
              <span className="nav_overlay-cta-arrow">
                <span className="arrow_icon-embed w-embed">{arrowSvg}</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
