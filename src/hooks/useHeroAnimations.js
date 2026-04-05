import { useEffect } from 'react';

/**
 * Unified hero animation hook that auto-detects page type:
 * - Homepage: .hero_wrap present
 * - Subpages: .subpage-hero present (replaces .pp-hero, .alp-hero, .ap-hero)
 * - Legacy pages: .pp-hero, .alp-hero, .ap-hero (for backward compatibility during migration)
 */
export function useHeroAnimation() {
  useEffect(() => {
    const timeouts = [];
    let retryTimeout = null;

    const initializeHeroAnimation = () => {
      const heroWrap = document.querySelector('.hero_wrap');
      const subpageHero = document.querySelector('.subpage-hero');
      const isPpPage = document.querySelector('.pp-hero');
      const isAlpPage = document.querySelector('.alp-hero');
      const isApPage = document.querySelector('.ap-hero');

      // If no hero container found yet, retry after a short delay
      if (!heroWrap && !subpageHero && !isPpPage && !isAlpPage && !isApPage) {
        retryTimeout = setTimeout(initializeHeroAnimation, 100);
        return;
      }

      // Determine page type
      if (heroWrap) {
        const heroLine = heroWrap.querySelector('.line-separate.is--hero');
        if (heroLine) {
          const timeout = setTimeout(() => {
            heroLine.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroLine.style.opacity = '1';
            heroLine.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1)';
          }, 700);
          timeouts.push(timeout);

          // Safety net
          const safetyTimeout = setTimeout(() => {
            if (
              heroLine.style.opacity === '0' ||
              heroLine.style.transform.includes('scale3d(0.1')
            ) {
              heroLine.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
              heroLine.style.opacity = '1';
              heroLine.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1)';
            }
          }, 5000);
          timeouts.push(safetyTimeout);
        }

        const bottomEls = heroWrap.querySelectorAll(
          '.hero_bottom_paragraph, .text-button_list:not(.is-animated), .bottom_buttons-wrapper .text-button_list:not(.is-animated)'
        );
        bottomEls.forEach((el, index) => {
          const timeout = setTimeout(() => {
            el.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.transform =
              'translate3d(0, 0%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
          }, 900);
          timeouts.push(timeout);

          // Safety net: if still hidden after 5 seconds, force visible
          const safetyTimeout = setTimeout(() => {
            if (
              el.style.transform.includes('100%') ||
              el.style.transform.includes('translate3d(0, 100%')
            ) {
              el.style.transition = 'transform 0.5s ease';
              el.style.transform = 'translate3d(0, 0%, 0)';
              el.style.opacity = '1';
            }
          }, 5000);
          timeouts.push(safetyTimeout);
        });
      } else if (subpageHero) {
        // New unified subpage hero

        // Animate heading lines with optimized timing (30% faster)
        document.querySelectorAll('.subpage-hero__heading-line').forEach((el, i) => {
          const timeout = setTimeout(
            () => {
              el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
            },
            150 + i * 100 // Optimized: was 200 + i * 120
          );
          timeouts.push(timeout);
        });

        // Animate fade elements with optimized timing
        document.querySelectorAll('.subpage-hero__fade, .ap-hero-fade').forEach((el, i) => {
          const timeout = setTimeout(
            () => {
              el.style.transition =
                'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.opacity = '1';
              el.style.transform = 'translate3d(0, 0, 0)';
            },
            400 + i * 60 // Optimized: was 600 + i * 80
          );
          timeouts.push(timeout);
        });

        // Animate team/partners page intro lines (tp-intro-line)
        document.querySelectorAll('.tp-intro-line').forEach((el, i) => {
          const timeout = setTimeout(
            () => {
              el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
            },
            900 + i * 160
          );
          timeouts.push(timeout);
        });

        // Safety net: force visible after 5 seconds if still hidden
        const safetyTimeout = setTimeout(() => {
          document.querySelectorAll('.subpage-hero__heading-line').forEach(el => {
            if (
              el.style.transform.includes('150%') ||
              el.style.transform.includes('120%') ||
              el.style.transform.includes('100%')
            ) {
              el.style.transition = 'transform 0.5s ease';
              el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
            }
          });

          document.querySelectorAll('.subpage-hero__fade, .ap-hero-fade').forEach(el => {
            if (el.style.opacity === '0' || el.style.transform.includes('translateY(1rem)')) {
              el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
              el.style.opacity = '1';
              el.style.transform = 'translate3d(0, 0, 0)';
            }
          });

          document.querySelectorAll('.tp-intro-line').forEach(el => {
            if (el.style.transform.includes('110%') || el.style.transform.includes('100%')) {
              el.style.transition = 'transform 0.5s ease';
              el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
            }
          });
        }, 5000);
        timeouts.push(safetyTimeout);
      } else {
        // Legacy page detection (for backward compatibility during migration)
        let prefix = '';
        if (isPpPage) prefix = 'pp';
        else if (isAlpPage) prefix = 'alp';
        else if (isApPage) prefix = 'ap';

        // Animate heading lines
        document.querySelectorAll(`.${prefix}-hero .${prefix}-heading-line`).forEach((el, i) => {
          const timeout = setTimeout(
            () => {
              el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
            },
            200 + i * 120
          );
          timeouts.push(timeout);
        });

        // Animate fade elements
        document.querySelectorAll(`.${prefix}-hero .${prefix}-hero-fade`).forEach((el, i) => {
          const timeout = setTimeout(
            () => {
              el.style.transition =
                'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.opacity = '1';
              el.style.transform = 'translate3d(0, 0, 0)';
            },
            600 + i * 80
          );
          timeouts.push(timeout);
        });

        // Animate team page intro lines (tp-intro-line)
        if (isPpPage) {
          document.querySelectorAll('.tp-intro-line').forEach((el, i) => {
            const timeout = setTimeout(
              () => {
                el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
                el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
              },
              900 + i * 160
            );
            timeouts.push(timeout);
          });
        }

        // Safety net: force visible after 5 seconds if still hidden
        const safetyTimeout = setTimeout(() => {
          document.querySelectorAll(`.${prefix}-hero .${prefix}-heading-line`).forEach(el => {
            if (
              el.style.transform.includes('150%') ||
              el.style.transform.includes('120%') ||
              el.style.transform.includes('100%')
            ) {
              el.style.transition = 'transform 0.5s ease';
              el.style.transform = 'translate3d(0, 0%, 0) rotateZ(0deg)';
            }
          });

          document.querySelectorAll(`.${prefix}-hero .${prefix}-hero-fade`).forEach(el => {
            if (el.style.opacity === '0' || el.style.transform.includes('translateY(1rem)')) {
              el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
              el.style.opacity = '1';
              el.style.transform = 'translate3d(0, 0, 0)';
            }
          });
        }, 5000);
        timeouts.push(safetyTimeout);
      }

      // Animate nav elements (shared across all pages)
      const navComponent = document.querySelector('.nav-component');
      if (navComponent) {
        const navLogo = navComponent.querySelector('.nav_logo-wrapper');
        const navButtons = navComponent.querySelector('.nav_buttons-wrapper');

        if (navLogo || navButtons) {
          const timeout = setTimeout(() => {
            [navLogo, navButtons].filter(Boolean).forEach(el => {
              el.style.transition =
                'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            });
          }, 300);
          timeouts.push(timeout);
        }
      }
    };

    initializeHeroAnimation();

    return () => {
      timeouts.forEach(clearTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);
}
