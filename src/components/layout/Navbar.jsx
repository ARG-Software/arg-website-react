import React, { useEffect, useState, useRef, useCallback } from 'react';
import AppLink from '../links/AppLink';
import { Logo } from '../icons/Logo';
import { trackCTA } from '../../hooks/useAnalytics';
import { useLenis } from '../../hooks/useLenis';
import { NAV_SCROLL_THRESHOLD } from '../../constants';

const navLinks = [
  { to: '/#about', label: 'About' },
  { to: '/#services', label: 'Services' },
  { to: '/#cases', label: 'Our Work' },
  { to: '/#testimonials', label: 'Testimonials' },
  { to: '/#work-with-us', label: 'Working with Us' },
  // { to: '/team', label: 'Team' },
  { to: '/partners/', label: 'Partners' },
  { to: '/articles/', label: 'Articles' },
  { to: '/#social', label: 'Social' },
  { to: '/#contact', label: 'Contact' },
];

export function Navbar({
  variant: _variant = 'transparent',
  position: _position = 'absolute',
  isHomePage: _isHomePage = false,
}) {
  const lenis = useLenis();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [curtainActive, setCurtainActive] = useState(false);
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
        '.hero_wrap, .subpage-hero, .pp-hero, .alp-hero, .ap-hero, .cp-hero'
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
        // Just entered scrolled state — hide instantly (no transition) until user scrolls up
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
      if (lenis) {
        lenis.on('scroll', handleScroll);
      }
    };

    setTimeout(initScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (lenis) {
        lenis.off('scroll', handleScroll);
      }
    };
  }, [lenis]);

  // Mobile check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 991);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle menu
  const toggleMenu = useCallback(
    event => {
      event.stopPropagation();
      event.preventDefault();

      if (menuOpen) {
        // Close
        setIsClosing(true);
        setMenuOpen(false);
        setTimeout(() => {
          setIsClosing(false);
        }, 400);
      } else {
        setMenuOpen(true);
      }
    },
    [menuOpen]
  );

  // Two-phase open: first render wrapper visible, then animate curtain on next frame
  useEffect(() => {
    if (menuOpen) {
      // Wait one frame so the wrapper is displayed before animating height
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCurtainActive(true);
        });
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurtainActive(false);
    }
  }, [menuOpen]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = event => {
      const wrapper = document.querySelector('.nav_menu-layout-wrapper');
      const hamburger = document.querySelector('.nav-hamburger');
      if (
        wrapper &&
        hamburger &&
        !wrapper.contains(event.target) &&
        !hamburger.contains(event.target)
      ) {
        setIsClosing(true);
        setMenuOpen(false);
        setTimeout(() => {
          setIsClosing(false);
        }, 400);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [menuOpen]);

  // Styles
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
        : { paddingTop: '2.875rem' }),
  };

  const showWrapper = menuOpen || isClosing;

  // Wrapper styles
  const wrapperStyle = {
    display: 'flex',
    visibility: showWrapper ? 'visible' : 'hidden',
    pointerEvents: showWrapper ? 'auto' : 'none',
    position: 'absolute',
    top: '5rem',
    right: 0,
    left: 'auto',
    bottom: 'auto',
    width: '100%',
    maxWidth: '15rem',
    minWidth: 'unset',
    height: 'auto',
    minHeight: 'unset',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 200,
    background: 'transparent',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    opacity: 1,
    transform: 'none',
    flexDirection: 'column',
    padding: 0,
    margin: 0,
    border: 'none',
    boxShadow: curtainActive ? '0 8px 32px rgba(0,0,0,0.18)' : '0 8px 32px rgba(0,0,0,0)',
    transition: curtainActive ? 'box-shadow 0.3s ease 0.2s' : 'box-shadow 0.15s ease',
  };

  // Backdrop curtain style
  const backdropStyle = {
    display: 'block',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    height: curtainActive ? '100%' : '0%',
    transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    borderRadius: '0.75rem',
  };

  // Nav layout style
  const navLayoutStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '1.625rem 2.375rem',
    width: '100%',
    position: 'relative',
    zIndex: 1,
    background: 'transparent',
    boxShadow: 'none',
    border: 'none',
    gap: 0,
    minWidth: '100%',
  };

  return (
    <div
      className="nav_wrap padding-global w-nav"
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
          <AppLink to="/" aria-label="Arg Software" className="nav_logo-wrapper w-nav-brand">
            <div className="nav_logo_icon">
              <Logo />
            </div>
          </AppLink>

          {/* Mobile menu dropdown */}
          <div className="nav_menu-layout-wrapper" style={wrapperStyle}>
            <div className="nav-menu_backdrop" style={backdropStyle} />
            <div className="nav_menu-layout" style={navLayoutStyle}>
              {navLinks.map((link, i) => {
                const isLast = i === navLinks.length - 1;

                // Stagger: on open, each link fades in after the curtain starts
                // On close, links fade out quickly before curtain retracts
                const linkStyle = {
                  display: 'block',
                  color: '#000',
                  borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.4)',
                  padding: '0.625rem 0',
                  marginLeft: 0,
                  marginRight: 0,
                  fontSize: '1rem',
                  background: 'transparent',
                  borderRadius: 0,
                  textAlign: 'left',
                  width: '100%',
                  opacity: curtainActive ? 1 : 0,
                  transform: curtainActive ? 'translateY(0)' : 'translateY(-8px)',
                  transition: curtainActive
                    ? `opacity 0.25s ease ${0.08 + i * 0.035}s, transform 0.25s ease ${0.08 + i * 0.035}s`
                    : 'opacity 0.15s ease, transform 0.15s ease',
                };

                return (
                  <AppLink
                    key={link.to}
                    to={link.to}
                    className={`nav-link w-nav-link${isLast ? ' is--last' : ''}`}
                    style={linkStyle}
                    onClick={() => {
                      if (menuOpen) {
                        setIsClosing(true);
                        setMenuOpen(false);
                        setTimeout(() => {
                          setIsClosing(false);
                        }, 400);
                      }
                    }}
                  >
                    {link.label}
                  </AppLink>
                );
              })}
            </div>
          </div>

          <div className="nav_buttons-wrapper">
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
  );
}
