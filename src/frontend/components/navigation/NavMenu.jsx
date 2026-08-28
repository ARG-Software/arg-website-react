import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { NavMenu as UiNavMenu } from '@ui/navigation/NavMenu.jsx';
import AppLink from './AppLink';
import { Logo } from '../icons/Logo';
import { trackEvent, trackCTA } from '@services/analytics';
import { loadBlogPostsMetadata } from '../../utils/blog';
import { getExternalLink, EXTERNAL_LINK_KEYS } from '../../services/linksService';
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

export function NavMenu({ isOpen, isClosing, onClose }) {
  const [latestPost, setLatestPost] = useState(null);
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  const { primary, selectedWork, company, latest, cta } = menuConfig;

  const featuredProjects = useMemo(() => {
    const count = selectedWork?.desktopCount ?? 4;
    const seed = getRotationSeed(selectedWork?.rotationSeed);
    return pickFeaturedProjects(count, seed).map(project => ({
      ...project,
      to: `/projects/${project.slug}/`,
    }));
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

  const handleAssistantClick = useCallback(
    event => {
      event.stopPropagation();
      handleClose();
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('gaspar:open', { detail: { source: 'nav_menu_chip' } })
        );
      }, 420);
    },
    [handleClose]
  );

  const ctaHref = useMemo(() => resolveCtaHref(cta?.to), [cta?.to]);

  return (
    <UiNavMenu
      wrapperRef={wrapperRef}
      containerRef={containerRef}
      isOpen={isOpen}
      logo={<Logo />}
      primary={primary}
      featuredProjects={featuredProjects}
      selectedWork={selectedWork}
      company={company}
      latestPost={latestPost}
      latest={latest}
      ctaHref={ctaHref}
      ctaLabel={cta?.label || 'Book a meeting'}
      onClose={handleClose}
      onCtaClick={handleCtaClick}
      onAssistantClick={handleAssistantClick}
      renderLink={renderAppLink(handleLinkClick)}
      renderLatestLink={renderAppLink(handleLinkClick)}
    />
  );
}

function renderAppLink(onClick) {
  function AppMenuLink({ key, to, className, children, ...props }) {
    return (
      <AppLink key={key || to} to={to} className={className} onClick={onClick} {...props}>
        {children}
      </AppLink>
    );
  }

  return AppMenuLink;
}
