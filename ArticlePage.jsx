import { useEffect, useRef } from 'react';
import { ARTICLES } from './articlesData';
import TransitionLink from "./TransitionLink";

// ─────────────────────────────────────────────
// Pass article slug as prop: <ArticlePage slug="cqrs-without-mediatr" />
// Falls back to first article if no slug given.
// ─────────────────────────────────────────────

export default function ArticlePage({ slug }) {
  const initialized = useRef(false);
  const ARTICLE = ARTICLES.find((a) => a.slug === slug) || ARTICLES[0];

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const docEl = document.documentElement;
    docEl.className += ' w-mod-js';
    if ('ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch)) {
      docEl.className += ' w-mod-touch';
    }

    const cssUrls = ['css/arg-staging-2cd0b9f16b9bd-c543d701aa025.webflow.a5d588191.min.css'];
    cssUrls.forEach((href) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
        document.head.appendChild(link);
      }
    });

    if (!document.querySelector('link[href*="highlight"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css';
      document.head.appendChild(css);
    }

    const EXTERNAL_SCRIPTS = [
      'js/jquery.js',
      'js/webflow-script.js',
      'https://unpkg.com/lenis@1.1.3/dist/lenis.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
    ];

    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = resolve; s.onerror = reject; document.body.appendChild(s);
    });

    const loadScripts = async () => {
      for (const src of EXTERNAL_SCRIPTS) { try { await loadScript(src); } catch (e) { console.warn('Failed:', src); } }
    };

    const initLenis = () => {
      if (typeof window.Lenis === 'undefined') return;
      const lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
      window.lenis = lenis;
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    };

    const initScrollAnimations = () => {
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('ap-visible'); observer.unobserve(e.target); } }),
        { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
      );
      document.querySelectorAll('.ap-animate').forEach((el) => observer.observe(el));
    };

    const initHeroAnimation = () => {
      document.querySelectorAll('.pp-hero .pp-heading-line').forEach((el, i) => {
        setTimeout(() => {
          el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
        }, 300 + i * 150);
      });

      document.querySelectorAll('.pp-hero .pp-hero-fade').forEach((el, i) => {
        setTimeout(() => {
          el.style.transition =
            'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.opacity = '1';
          el.style.transform = 'translate3d(0, 0, 0)';
        }, 700 + i * 100);
      });

      // Nav elements — match homepage timing
      const navComponent = document.querySelector('.nav-component');
      if (navComponent) {
        const navEls = [
          navComponent.querySelector('.nav_logo-wrapper'),
          navComponent.querySelector('.nav_buttons-wrapper'),
        ].filter(Boolean);

        setTimeout(() => {
          navEls.forEach((el) => {
            el.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
        }, 300);
      }

      document.querySelectorAll('.ap-hero .ap-heading-line').forEach((el, i) => {
        setTimeout(() => {
          el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
        }, 200 + i * 120);
      });
      document.querySelectorAll('.ap-hero .ap-hero-fade').forEach((el, i) => {
        setTimeout(() => {
          el.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.opacity = '1';
          el.style.transform = 'translate3d(0, 0, 0)';
        }, 600 + i * 80);
      });
    };

    const initHighlight = () => {
      if (typeof window.hljs !== 'undefined') window.hljs.highlightAll();
    };

    const initMobileNav = () => {
      const hamburger = document.querySelector('.nav-hamburger');
      const menuWrapper = document.querySelector('.nav_menu-layout-wrapper');
      if (!hamburger || !menuWrapper) return;
      let isOpen = false;
      hamburger.addEventListener('click', (e) => {
        e.stopImmediatePropagation(); e.preventDefault();
        isOpen = !isOpen;
        if (isOpen) {
          menuWrapper.style.display = 'flex';
          requestAnimationFrame(() => menuWrapper.classList.add('menu--open'));
          document.body.style.overflow = 'hidden';
          if (window.lenis) window.lenis.stop();
          menuWrapper.querySelectorAll('.nav-link').forEach((link, i) => {
            link.style.opacity = '0';
            setTimeout(() => { link.style.transition = 'opacity 0.3s ease'; link.style.opacity = '1'; }, 100 + i * 50);
          });
        } else {
          menuWrapper.classList.remove('menu--open');
          menuWrapper.querySelectorAll('.nav-link').forEach((link) => { link.style.opacity = '0'; });
          setTimeout(() => { menuWrapper.style.display = 'none'; document.body.style.overflow = ''; if (window.lenis) window.lenis.start(); }, 300);
        }
      }, true);
    };

    loadScripts().then(() => {
      setTimeout(() => {
        initLenis();
        initHeroAnimation();
        initScrollAnimations();
        initHighlight();
        setTimeout(initMobileNav, 500);
      }, 300);
    });
  }, []);

  // ── SVGs ──────────────────────────────────────
  const arrowSvg = (
    <svg viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.77734 8.5L13.3329 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
      <path d="M9.11133 3.83203L13.778 8.4987L9.11133 13.1654" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
    </svg>
  );
const linkedinSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );

  const githubSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>GitHub icon</title>
      <path d="M12,2.2467A10.00042,10.00042,0,0,0,8.83752,21.73419c.5.08752.6875-.21247.6875-.475,0-.23749-.01251-1.025-.01251-1.86249C7,19.85919,6.35,18.78423,6.15,18.22173A3.636,3.636,0,0,0,5.125,16.8092c-.35-.1875-.85-.65-.01251-.66248A2.00117,2.00117,0,0,1,6.65,17.17169a2.13742,2.13742,0,0,0,2.91248.825A2.10376,2.10376,0,0,1,10.2,16.65923c-2.225-.25-4.55-1.11254-4.55-4.9375a3.89187,3.89187,0,0,1,1.025-2.6875,3.59373,3.59373,0,0,1,.1-2.65s.83747-.26251,2.75,1.025a9.42747,9.42747,0,0,1,5,0c1.91248-1.3,2.75-1.025,2.75-1.025a3.59323,3.59323,0,0,1,.1,2.65,3.869,3.869,0,0,1,1.025,2.6875c0,3.83747-2.33752,4.6875-4.5625,4.9375a2.36814,2.36814,0,0,1,.675,1.85c0,1.33752-.01251,2.41248-.01251,2.75,0,.26251.1875.575.6875.475A10.0053,10.0053,0,0,0,12,2.2467Z" />
    </svg>
  );

  const mediumSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Medium icon</title>
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.11-.53 5.62-1.18 5.62-.66 0-1.18-2.51-1.18-5.62s.52-5.62 1.18-5.62c.65 0 1.18 2.51 1.18 5.62z" />
    </svg>
  );  const logoSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 62 33" fill="none" className="svg">
      <path d="M15.5309 4.98386C14.977 3.93989 14.1229 3.08584 13.0789 2.53187C11.9364 1.92027 10.6567 1.61049 9.36093 1.63187C7.62423 1.60033 5.91506 2.06858 4.43693 2.98086C3.00696 3.87926 1.86504 5.16939 1.14692 6.69787C0.366136 8.35873 -0.0254702 10.1758 0.00191778 12.0109C-0.0303673 13.8477 0.345335 15.6688 1.10192 17.3429C1.79306 18.8591 2.90692 20.1438 4.30992 21.0429C5.79829 21.9655 7.52331 22.4343 9.27392 22.3919C10.5781 22.4072 11.8647 22.0906 13.0129 21.4719C14.0638 20.935 14.9366 20.1052 15.5259 19.0829V21.8619H21.7369V2.16186H15.5239L15.5309 4.98386ZM14.5499 15.7319C14.1226 16.2269 13.5871 16.6171 12.9849 16.8721C12.3826 17.1272 11.7299 17.2404 11.0769 17.2029C10.4363 17.2282 9.79807 17.1112 9.20809 16.8603C8.61812 16.6094 8.09109 16.2308 7.66493 15.7519C6.78114 14.7121 6.32191 13.3773 6.37892 12.0139C6.31996 10.6559 6.77972 9.32635 7.66493 8.29487C8.09454 7.82158 8.6227 7.44826 9.21221 7.20119C9.80173 6.95412 10.4382 6.83931 11.0769 6.86487C11.73 6.82734 12.3828 6.94058 12.9851 7.19584C13.5873 7.45109 14.1228 7.84151 14.5499 8.33687C15.3879 9.37537 15.8232 10.6813 15.7759 12.0149C15.8276 13.361 15.3924 14.6807 14.5499 15.7319Z" fill="currentColor"/>
      <path d="M42.0361 1.84085H37.5951C36.3129 1.83665 35.0692 2.27885 34.0775 3.09157C33.0858 3.90428 32.4079 5.03683 32.1601 6.29485V2.16785H25.9141V21.8679H32.1651V14.2679C32.0408 12.527 32.5011 10.7945 33.4731 9.34485C33.9438 8.78245 34.5409 8.33935 35.2155 8.05173C35.8902 7.7641 36.6233 7.6401 37.3551 7.68985C37.5371 7.68985 37.749 7.70085 37.955 7.71085L37.9651 7.67685C38.2118 6.87993 38.5371 6.10948 38.9361 5.37685C39.7114 3.99485 40.7674 2.79038 42.0361 1.84085Z" fill="currentColor"/>
      <path d="M45.0374 21.0679C46.8431 21.942 48.8233 22.3961 50.8294 22.3961C52.8356 22.3961 54.8157 21.942 56.6214 21.0679C58.2212 20.2307 59.5419 18.9448 60.4214 17.3679C61.2927 15.7192 61.7481 13.8826 61.7481 12.0179C61.7481 10.1531 61.2927 8.31657 60.4214 6.66788C60.1394 6.17669 59.8134 5.71211 59.4474 5.27988H61.7474V0.00488281L59.0074 1.32888L56.1004 2.72888C54.3473 1.97226 52.4518 1.60198 50.5428 1.64322C48.6339 1.68446 46.7562 2.13625 45.0374 2.96788C43.4302 3.80189 42.1023 5.08811 41.2174 6.66788C40.3461 8.31657 39.8906 10.1531 39.8906 12.0179C39.8906 13.8826 40.3461 15.7192 41.2174 17.3679C42.1012 18.9485 43.4294 20.235 45.0374 21.0679ZM47.3854 8.31288C48.3033 7.40921 49.5398 6.90272 50.8279 6.90272C52.116 6.90272 53.3525 7.40921 54.2704 8.31288C55.0925 9.37107 55.5387 10.6729 55.5387 12.0129C55.5387 13.3529 55.0925 14.6547 54.2704 15.7129C53.3525 16.6166 52.116 17.1231 50.8279 17.1231C49.5398 17.1231 48.3033 16.6166 47.3854 15.7129C46.5742 14.6491 46.1348 13.3482 46.1348 12.0104C46.1348 10.6725 46.5742 9.37172 47.3854 8.30788V8.31288Z" fill="currentColor"/>
      <path d="M55.1508 24.4308C54.9683 25.0276 54.6653 25.5806 54.2607 26.0558C53.3428 26.9595 52.1064 27.4659 50.8183 27.4659C49.5302 27.4659 48.2937 26.9595 47.3758 26.0558C46.9621 25.5642 46.6556 24.9916 46.4758 24.3748C46.4218 24.2088 46.3468 24.0588 46.3068 23.8838H39.9688C40.125 25.2278 40.5436 26.528 41.2007 27.7108C42.0848 29.2912 43.4129 30.5776 45.0208 31.4108C46.8266 32.2844 48.8067 32.7382 50.8127 32.7382C52.8188 32.7382 54.7989 32.2844 56.6048 31.4108C58.2045 30.5736 59.5252 29.2877 60.4048 27.7108C61.0619 26.528 61.4805 25.2278 61.6367 23.8838H55.3368C55.2847 24.0693 55.2226 24.2519 55.1508 24.4308Z" fill="url(#paint0_linear_ap)"/>
      <defs>
        <linearGradient id="paint0_linear_ap" x1="39.9688" y1="28.311" x2="61.6367" y2="28.311" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0060D"/><stop offset="0.494" stopColor="#C924D7"/><stop offset="1" stopColor="#7904FD"/>
        </linearGradient>
      </defs>
    </svg>
  );

  // ── Content renderer ───────────────────────────────────────
  const renderBlock = (block, i) => {
    const delay = `${(i % 5) * 0.05}s`;
    switch (block.type) {
      case 'lead':
        return <p key={i} className="ap-lead ap-animate" style={{ transitionDelay: delay }}>{block.text}</p>;
      case 'paragraph':
        return <p key={i} className="ap-p ap-animate" style={{ transitionDelay: delay }}>{block.text}</p>;
      case 'heading':
        return <h2 key={i} className="ap-h2 ap-animate" style={{ transitionDelay: delay }}>{block.text}</h2>;
      case 'subheading':
        return <h3 key={i} className="ap-h3 ap-animate" style={{ transitionDelay: delay }}>{block.text}</h3>;
      case 'callout':
        return <blockquote key={i} className="ap-callout ap-animate" style={{ transitionDelay: delay }}>{block.text}</blockquote>;
      case 'code':
        return (
          <div key={i} className="ap-code-wrap ap-animate" style={{ transitionDelay: delay }}>
            <div className="ap-code-bar"><span className="ap-code-lang">{block.lang}</span></div>
            <pre><code className={`language-${block.lang}`}>{block.text}</code></pre>
          </div>
        );
      case 'list':
        return (
          <ul key={i} className="ap-list">
            {block.items.map((item, j) => (
              <li key={j} className="ap-list-item ap-animate" style={{ transitionDelay: `${j * 0.07}s` }}>
                <span className="ap-list-label">{item.label}</span> {item.text}
              </li>
            ))}
          </ul>
        );
      default: return null;
    }
  };

  // Split title for gradient effect on last line
  const titleWords = ARTICLE.title.split(' ');
  const titleBreak = Math.floor(titleWords.length * 0.55);
  const titleLine1 = titleWords.slice(0, titleBreak).join(' ');
  const titleLine2 = titleWords.slice(titleBreak).join(' ');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html.lenis, html.lenis body { height: auto; }
        .lenis.lenis-smooth { scroll-behavior: auto !important; }
        .lenis.lenis-stopped { overflow: hidden; }
        .w-nav-overlay { visibility: hidden; }

        .nav_menu-layout-wrapper {
          display: none; position: fixed; inset: 0; z-index: 100;
          flex-direction: column; justify-content: center; align-items: center;
          background: rgba(20,17,52,0.97); backdrop-filter: blur(12px);
          transition: opacity 0.3s ease; opacity: 0;
        }
        .nav_menu-layout-wrapper.menu--open { opacity: 1; }
        .nav_menu-layout-wrapper .nav_menu-layout {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 2rem; width: 100%; max-width: 400px;
        }
        .nav_menu-layout-wrapper .nav-link {
          display: block; padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          width: 100%; color: #fff; font-size: 1rem; opacity: 0;
        }

        /* ── HERO ── */
        .ap-hero {
          background-color: #0c002e;
          min-height: 70vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-bottom: 6rem;
          position: relative;
        }
        .ap-hero-inner {
          padding-left: 4.75rem; padding-right: 4.75rem;
          max-width: 90rem; margin: 0 auto; width: 100%;
        }
        .ap-hero-meta {
          display: flex; align-items: center; gap: 1.5rem;
          margin-bottom: 2rem; opacity: 0; transform: translateY(1rem);
          font-family: Neuemontreal, sans-serif;
        }
        .ap-hero-meta span {
          font-size: 0.75rem; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
        }
        .ap-hero-meta span.ap-tag {
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.3rem 0.75rem; border-radius: 2rem;
        }
        .ap-hero h1 {
          font-size: clamp(2.25rem, 4.5vw, 4.5rem);
          font-weight: 400; line-height: 1.05; color: #fff;
          margin: 0 0 1.5rem; font-family: Neuemontreal, sans-serif;
          max-width: 28ch;
        }
        .ap-hero .heading_line { overflow: hidden; }
        .ap-heading-line {
          display: block;
          transform: translate3d(0, 130%, 0) rotateZ(3deg);
        }
        .ap-hero-subtitle {
          font-size: 1.125rem; color: rgba(255,255,255,0.45);
          font-family: Neuemontreal, sans-serif; font-weight: 400;
          margin: 0; opacity: 0; transform: translateY(1rem); max-width: 50ch;
        }
        .ap-hero-divider {
          position: absolute; bottom: 0; left: 4.75rem; right: 4.75rem;
          height: 1px; background: rgba(255,255,255,0.1);
        }

        /* ── ARTICLE LAYOUT ── */
        .ap-body { background: #fff; padding-top: 0; padding-bottom: 10rem; }
        .ap-body-inner {
          max-width: 90rem; margin: 0 auto;
          padding: 7rem 4.75rem 0;
          display: grid;
          grid-template-columns: 14rem 1fr 14rem;
          column-gap: 4rem;
        }

        /* Sidebars */
        .ap-sidebar-left {
          grid-column: 1; position: sticky; top: 6rem; align-self: start;
        }
        .ap-sidebar-left-label {
          font-size: 0.625rem; letter-spacing: 0.3em; text-transform: uppercase;
          color: #aaa; margin-bottom: 0.75rem; font-family: Neuemontreal, sans-serif;
        }
        .ap-sidebar-left a {
          display: block; font-size: 0.875rem; color: #000; text-decoration: none;
          line-height: 1.6; margin-bottom: 0.25rem; opacity: 0.5;
          transition: opacity 0.2s; font-family: Neuemontreal, sans-serif;
        }
        .ap-sidebar-left a:hover { opacity: 1; }

        /* ── SHARE SIDEBAR (fixed alignment) ── */
        .ap-sidebar-right {
          grid-column: 3; position: sticky; top: 6rem; align-self: start;
        }
        .ap-sidebar-share-label {
          font-size: 0.625rem; letter-spacing: 0.3em; text-transform: uppercase;
          color: #aaa; margin-bottom: 0.875rem; font-family: Neuemontreal, sans-serif;
          display: block;
        }
        .ap-share-links {
          display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;
        }
        .ap-share-links .text-button {
          display: flex !important; align-items: center;
          width: 100%;
        }

        .ap-content { grid-column: 2; min-width: 0; }

        /* ── TYPOGRAPHY ── */
        .ap-lead {
          font-size: 1.25rem; line-height: 1.75; color: #111;
          margin: 0 0 2rem; font-family: Neuemontreal, sans-serif; font-weight: 400;
        }
        .ap-p {
          font-size: 1rem; line-height: 1.85; color: #3a3a3a;
          margin: 0 0 1.5rem; font-family: Neuemontreal, sans-serif;
        }
        .ap-h2 {
          font-size: 1.75rem; font-weight: 400; color: #000;
          margin: 4rem 0 1.25rem; font-family: Neuemontreal, sans-serif; line-height: 1.2;
        }
        .ap-h3 {
          font-size: 1.125rem; font-weight: 500; color: #000;
          margin: 2.5rem 0 0.875rem; font-family: Neuemontreal, sans-serif; letter-spacing: 0.01em;
        }
        .ap-callout {
          border-left: 2px solid;
          border-image: linear-gradient(180deg, #F0060D, #C924D7, #7904FD) 1;
          margin: 3rem 0; padding: 0.25rem 0 0.25rem 2rem;
          font-size: 1.125rem; line-height: 1.6; color: #111;
          font-family: Neuemontreal, sans-serif; font-style: normal; font-weight: 400;
        }

        /* ── CODE ── */
        .ap-code-wrap { margin: 1.75rem 0; border-radius: 0.75rem; overflow: hidden; border: 1px solid #1e1e2e; }
        .ap-code-bar {
          background: #161625; padding: 0.6rem 1.25rem;
          display: flex; align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ap-code-lang {
          font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); font-family: monospace;
        }
        .ap-code-wrap pre {
          margin: 0; padding: 1.5rem 1.25rem; overflow-x: auto;
          background: #1a1a2e !important; font-size: 0.8125rem; line-height: 1.75;
        }
        .ap-code-wrap pre code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          background: transparent !important; padding: 0 !important;
        }

        /* ── LIST ── */
        .ap-list { list-style: none; margin: 2rem 0; padding: 0; display: flex; flex-direction: column; }
        .ap-list-item {
          padding: 1.25rem 0; border-bottom: 1px solid #f0f0f0;
          font-size: 1rem; line-height: 1.7; color: #3a3a3a;
          font-family: Neuemontreal, sans-serif;
        }
        .ap-list-item:first-child { border-top: 1px solid #f0f0f0; }
        .ap-list-label {
          font-weight: 500; color: #000; display: block;
          margin-bottom: 0.2rem; font-size: 0.9375rem;
        }

        /* ── MEDIUM BANNER ── */
        .ap-medium-banner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1.5rem; padding: 1.75rem 2rem; background: #f7f7f8;
          border-radius: 0.75rem; margin-bottom: 3rem;
        }
        .ap-medium-text {
          font-size: 0.875rem; color: #555; line-height: 1.5;
          font-family: Neuemontreal, sans-serif;
        }
        .ap-medium-text strong { color: #000; }

        /* ── SCROLL REVEAL ── */
        .ap-animate {
          opacity: 0; transform: translate3d(0, 1.5rem, 0);
          transition: opacity 0.7s cubic-bezier(0.215, 0.61, 0.355, 1),
                      transform 0.7s cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        .ap-animate.ap-visible { opacity: 1; transform: translate3d(0, 0, 0); }

        /* ── RESPONSIVE ── */
        @media screen and (max-width: 1200px) {
          .ap-body-inner { grid-template-columns: 0 1fr 0; column-gap: 0; }
          .ap-sidebar-left, .ap-sidebar-right { display: none; }
          .ap-content { grid-column: 2; }
        }
        @media screen and (max-width: 991px) {
          .ap-hero-inner, .ap-body-inner { padding-left: 3rem; padding-right: 3rem; }
          .ap-hero-divider { left: 3rem; right: 3rem; }
        }
        @media screen and (max-width: 767px) {
          .ap-hero { min-height: 55vh; padding-bottom: 4rem; }
          .ap-hero-inner, .ap-body-inner { padding-left: 2.25rem; padding-right: 2.25rem; }
          .ap-hero-divider { left: 2.25rem; right: 2.25rem; }
          .ap-body { padding-bottom: 6rem; }
          .ap-h2 { font-size: 1.5rem; }
          .ap-medium-banner { flex-direction: column; align-items: flex-start; }
        }
        @media screen and (max-width: 479px) {
          .ap-hero-inner, .ap-body-inner { padding-left: 1rem; padding-right: 1rem; }
          .ap-hero-divider { left: 1rem; right: 1rem; }
        }
      `}} />

      <div className="page-wrapper w-clearfix">

        {/* NAV */}
        <div
          className="nav_wrap padding-global w-nav"
          data-animation="default" data-easing2="ease-in" data-easing="ease-in"
          data-collapse="all" role="banner" data-no-scroll="1" data-duration="400"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', paddingTop: '2.875rem', zIndex: 10 }}
        >
          <div className="nav_contain container">
            <div style={{ opacity: 1 }} className="nav-component">
              <a aria-label="Arg Software" href="/" className="nav_logo-wrapper w-nav-brand">
                <div className="nav_logo_icon">{logoSvg}</div>
              </a>
              <div style={{ display: 'none' }} className="nav_menu-layout-wrapper">
                <div className="nav_menu-layout">
                  <TransitionLink to="/#about" className="nav-link w-nav-link">
                    About
                  </TransitionLink>
                  <TransitionLink to="/#services" className="nav-link w-nav-link">
                    Services
                  </TransitionLink>
                  <TransitionLink to="/#cases" className="nav-link w-nav-link">
                    Our Work
                  </TransitionLink>
                  <TransitionLink to="/#testimonials" className="nav-link w-nav-link">
                    Testimonials
                  </TransitionLink>
                  <TransitionLink to="/#work-with-us" className="nav-link w-nav-link">
                    Working with Us
                  </TransitionLink>
                  <TransitionLink to="/team" className="nav-link w-nav-link">
                    Team
                  </TransitionLink>
                  <TransitionLink to="/partners" className="nav-link w-nav-link">
                    Partners
                  </TransitionLink>
                  <TransitionLink to="/articles" className="nav-link w-nav-link">
                    Articles
                  </TransitionLink>
                  <TransitionLink to="/#social" className="nav-link w-nav-link">
                    Social
                  </TransitionLink>
                  <TransitionLink to="/#contact" className="nav-link is--last w-nav-link">
                    Contact
                  </TransitionLink>
                </div>
                <div style={{ height: '0%' }} className="nav-menu_backdrop"></div>
              </div>
              <div className="nav_buttons-wrapper">
                <a href="https://zcal.co/argsoftware/project" target="_blank" rel="noopener noreferrer" className="button-base w-inline-block">
                  <div className="button-base_text_wrap">
                    <div className="button-base__button-text">Book a Meeting  </div>
                    <div className="button-base__button-text is-animated">No commitment</div>
                  </div>
                </a>
                <div className="nav-hamburger w-nav-button">
                  <div className="menu-icon z-index-2">
                    <div className="menu_icon-line is--top"></div>
                    <div className="menu_icon-line is--bottom"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="main-wrapper">

          {/* HERO */}
          <header className="ap-hero">
            <div className="ap-hero-inner">
              <div className="ap-hero-meta ap-hero-fade">
                <span className="ap-tag">{ARTICLE.tag}</span>
                <span>{ARTICLE.date}</span>
                <span>{ARTICLE.readTime}</span>
              </div>
              <h1>
                <div className="heading_line">
                  <span className="ap-heading-line">{titleLine1}</span>
                </div>
                <div className="heading_line">
                  <span className="ap-heading-line text-color-gradiant" style={{ transitionDelay: '0.12s' }}>{titleLine2}</span>
                </div>
              </h1>
              <p className="ap-hero-subtitle ap-hero-fade">{ARTICLE.subtitle}</p>
            </div>
            <div className="ap-hero-divider"></div>
          </header>

          {/* ARTICLE BODY */}
          <section className="ap-body background-color-white">
            <div className="ap-body-inner">

              {/* Left sidebar */}
              <aside className="ap-sidebar-left">
                <div className="ap-sidebar-left-label">Navigation</div>
                <TransitionLink to="/articles">
                    ← All articles
                </TransitionLink>
                <TransitionLink to="/#contact">
                    Work with us
                </TransitionLink>
              </aside>

              {/* Article */}
              <article className="ap-content">
                <div className="ap-medium-banner ap-animate">
                  <div className="ap-medium-text">
                    <strong>Originally published on Medium.</strong><br />
                    Follow us there for more articles on .NET architecture, security, and engineering practices.
                  </div>
                  <a href={ARTICLE.mediumUrl} target="_blank" rel="noopener noreferrer" className="text-button w-inline-block" style={{ flexShrink: 0 }}>
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Read on Medium</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Open post</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                </div>

                {ARTICLE.content.map((block, i) => renderBlock(block, i))}
              </article>

              {/* Right sidebar — share (fixed alignment) */}
              <aside className="ap-sidebar-right">
                <span className="ap-sidebar-share-label">Share</span>
                <div className="ap-share-links">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(ARTICLE.title)}&url=${encodeURIComponent(ARTICLE.mediumUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-button w-inline-block"
                  >
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Share on X</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Post it</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ARTICLE.mediumUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-button w-inline-block"
                  >
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Share on LinkedIn</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Post it</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                </div>
              </aside>

            </div>
          </section>

          {/* CTA */}
          <section className="section_cta">
            <div className="padding-global is--cta-mobile">
              <div className="container-large">
                <div className="padding-bottom padding-130-74"></div>
                <div className="cta-wrapper">
                  <div className="cta-content">
                    <div className="heading_wrap">
                      <div className="header-animation hide-tablet">
                        <h2 className="heading-style-h1 hide-mobile-portrait ap-animate">Ready to elevate</h2>
                      </div>
                      <div className="header-animation show-tablet">
                        <h2 className="heading-style-h1 ap-animate">Ready to elevate your</h2>
                      </div>
                      <div className="header-animation hide-tablet">
                        <h2 className="heading-style-h1 ap-animate" style={{ transitionDelay: '0.12s' }}>
                          <span className="text-color-gradiant-2">your digital experience?</span>
                        </h2>
                      </div>
                      <div className="header-animation show-tablet">
                        <h2 className="heading-style-h1 ap-animate" style={{ transitionDelay: '0.12s' }}>
                          <span className="text-color-gradiant-2">digital experience?</span>
                        </h2>
                      </div>
                    </div>
                    <div className="padding-bottom padding-48"></div>
                    <a href="https://zcal.co/argsoftware/project" target="_blank" rel="noopener noreferrer" className="button-base button-contact w-inline-block ap-animate" style={{ transitionDelay: '0.24s' }}>
                      <div className="button-base_text_wrap">
                        <div className="button-base__button-text">Book a Meeting</div>
                        <div className="button-base__button-text is-animated">      Let's meet</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="footer">
          <div className="container-medium footer-container padding-global">
            <div className="line-separate is--footer"></div>
            <div className="footer_copywrite-content">
              <div className="overflow-hidden">
                <div className="hide-mobile-landscape">© Arg 2025. All Rights Reserved</div>
              </div>
              <div className="footer_copywrite-buttons">
<a aria-label="Linkedin" href="https://www.linkedin.com/company/arg-software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{linkedinSvg}</div>
                </a>
                <a aria-label="Github" href="https://github.com/ARG-Software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{githubSvg}</div>
                </a>
                <a aria-label="Medium" href="https://medium.com/@arg-software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{mediumSvg}</div>
                </a>
              </div>
              <div className="footer_copywrite-text-mobile">
                <div className="text-block-2">Arg is based in Funchal and Porto, Portugal</div>
                <div className="show-mobile-landscape">© Arg 2025. All Rights Reserved</div>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
