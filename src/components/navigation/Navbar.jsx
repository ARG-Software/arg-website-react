import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import AppLink from './AppLink';
import { Logo } from '../icons/Logo';
import { trackCTA } from '../../hooks/useAnalytics';
import { LenisContext } from '../../providers/LenisProvider';
import { NAV_SCROLL_THRESHOLD } from '../../constants';
import { NavMenu } from './NavMenu';

export function Navbar({ variant = 'transparent', position: _position = 'absolute' }) {
  const isCompact = variant === 'dark';
  const lenis = useContext(LenisContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastYRef = useRef(0);
  const hasScrolledUpRef = useRef(false);
  const isScrolledRef = useRef(false);
  const [hideInstant, setHideInstant] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Scroll logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const hero = document.querySelector(
        '.hero_wrap, .page-header, .pp-hero, .blp-hero, .bp-hero, .prp-hero'
      );

      let scrolled = false;
      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        scrolled = heroRect.bottom <= 0;
      } else {
        scrolled = scrollY >= 50;
      }

      const wasScrolled = isScrolledRef.current;
      setIsScrolled(scrolled);
      isScrolledRef.current = scrolled;

      if (!scrolled) {
        setIsHidden(false);
        hasScrolledUpRef.current = false;
      } else {
        if (!wasScrolled) {
          setHideInstant(true);
          setIsHidden(true);
          hasScrolledUpRef.current = false;
        }

        const delta = scrollY - lastYRef.current;

        if (delta < -NAV_SCROLL_THRESHOLD) {
          setHideInstant(false);
          setIsHidden(false);
          hasScrolledUpRef.current = true;
        } else if (delta > NAV_SCROLL_THRESHOLD && hasScrolledUpRef.current) {
          setIsHidden(true);
        }
      }

      lastYRef.current = scrollY;
    };

    const initScroll = () => {
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
      if (lenis) lenis.on('scroll', handleScroll);
    };

    setTimeout(initScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (lenis) lenis.off('scroll', handleScroll);
    };
  }, [lenis]);

  // Mobile check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 991);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const closeMenu = useCallback(() => {
    setIsClosing(true);
    setMenuOpen(false);
    setTimeout(() => setIsClosing(false), 400);
  }, []);

  const toggleMenu = useCallback(
    e => {
      e.stopPropagation();
      e.preventDefault();
      if (menuOpen) {
        closeMenu();
      } else {
        setMenuOpen(true);
      }
    },
    [menuOpen, closeMenu]
  );

  const bgStyle = isScrolled
    ? { background: '#0c002e', borderBottom: '1px solid #0c002e' }
    : { background: 'transparent', borderBottom: 'none' };

  const navStyle = {
    position: isScrolled ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1050,
    transform: isHidden ? 'translateY(-100%)' : 'translateY(0)',
    transition: hideInstant
      ? 'none'
      : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
    ...bgStyle,
    ...(isMobile
      ? {}
      : isScrolled
        ? { paddingTop: '0.75rem', paddingBottom: '0.75rem' }
        : isCompact
          ? { paddingTop: '1.5rem', paddingBottom: '0.75rem' }
          : { paddingTop: '2.875rem' }),
  };

  return (
    <>
      <div
        className="nav_wrap padding-global w-nav"
        data-animate-scope
        data-animate-default-stagger="300"
        data-animation="default"
        data-easing2="ease-in"
        data-easing="ease-in"
        data-collapse="all"
        role="banner"
        data-no-scroll="1"
        data-duration="400"
        style={navStyle}
      >
        <div className="nav_contain container" style={{ background: 'transparent' }}>
          <div style={{ opacity: 1 }} className="nav-component">
            <AppLink
              to="/"
              aria-label="Arg Software"
              className="nav_logo-wrapper w-nav-brand"
              data-animate="fade-up"
              data-animate-trigger="load"
              data-animate-order="0"
            >
              <div className="nav_logo_icon">
                <Logo />
              </div>
            </AppLink>

            <div
              className="nav_buttons-wrapper"
              data-animate="fade-up"
              data-animate-trigger="load"
              data-animate-order="1"
            >
              <a
                href="https://zcal.co/argsoftware/project"
                target="_blank"
                rel="noopener noreferrer"
                className="button-base w-inline-block"
                onClick={() => trackCTA('book_meeting', 'navbar')}
              >
                <div className="button-base_text_wrap">
                  <div className="button-base__button-text">Book a Meeting</div>
                  <div className="button-base__button-text is-animated">No commitment</div>
                </div>
              </a>
              <div
                className={`nav-hamburger w-nav-button${menuOpen ? ' is-open' : ''}`}
                onClick={toggleMenu}
              >
                <div className="menu-icon z-index-2">
                  <div className="menu_icon-line is--top"></div>
                  <div className="menu_icon-line is--bottom"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NavMenu isOpen={menuOpen} isClosing={isClosing} onClose={closeMenu} />
    </>
  );
}
