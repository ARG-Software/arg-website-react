import { useEffect } from 'react';
import { trackProjectOpen } from './useAnalytics';
import { useLenis } from './useLenis';

export function useProjectModalAnimations() {
  const lenis = useLenis();
  useEffect(() => {
    // Early exit if no project items
    const projectItems = document.querySelectorAll('.projects_item_wrap');
    if (!projectItems.length) return;

    let _canvas, _material, _raf;
    let mounted = true;
    const cleanupFns = [];

    const initThreeBackdrop = async () => {
      if (!mounted) return;

      function stopBackdropLoop() {
        if (_raf) {
          cancelAnimationFrame(_raf);
          _raf = null;
        }
      }

      function hideCanvas() {
        if (!_canvas) return;
        _canvas.style.opacity = '0';
        setTimeout(() => {
          if (_canvas.parentNode) _canvas.remove();
        }, 450);
      }

      // Guard against _material being undefined
      function animateBackdrop(from, to, ms) {
        return new Promise(resolve => {
          if (!_material) {
            resolve();
            return;
          }
          const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
          const t0 = performance.now();
          function step() {
            const progress = Math.min((performance.now() - t0) / ms, 1);
            _material.uniforms.uProgress.value = from + (to - from) * ease(progress);
            if (progress < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      }

      const cubicOut = t => 1 - Math.pow(1 - t, 3);
      const cubicInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

      function animateValue(from, to, ms, easeFn, onUpdate) {
        return new Promise(resolve => {
          const t0 = performance.now();
          function step() {
            const progress = Math.min((performance.now() - t0) / ms, 1);
            onUpdate(from + (to - from) * easeFn(progress));
            if (progress < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      }

      function lerp(a, b, t) {
        return a + (b - a) * t;
      }

      /* ─── Inject scrollbar styles once ─── */
      if (!document.getElementById('modal-scrollbar-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-scrollbar-styles';
        style.textContent = `
          .modal_wrap {
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          @media screen and (min-width: 768px) {
            .modal_wrap {
              scrollbar-width: thin;
              scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
            }
            
            .modal_wrap::-webkit-scrollbar {
              width: 0.5rem;
            }
            
            .modal_wrap::-webkit-scrollbar-track {
              background: transparent;
            }
            
            .modal_wrap::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.3);
              border-radius: 4px;
            }
          }
          
          @media screen and (max-width: 767px) {
            .modal_wrap {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            
            .modal_wrap::-webkit-scrollbar {
              display: none;
            }
          }
          
          .modal {
            overflow-y: visible;
          }
        `;
        document.head.appendChild(style);
      }

      /* ─── Click handlers ─── */
      projectItems.forEach(element => {
        element.addEventListener('click', async () => {
          if (!mounted) return;
          const clickedItem = element.querySelector('.projects_item');
          const projectTitle = element.querySelector('.heading-style-h3')?.textContent?.trim();
          if (projectTitle) trackProjectOpen(projectTitle);
          const isMobile = window.matchMedia('(max-width: 479px)').matches;
          const isTablet = window.matchMedia('(max-width: 767px)').matches;
          const targetWidthPct = isMobile ? 90 : isTablet ? 85 : 80;

          document.body.style.overflow = 'hidden';
          if (lenis) lenis.stop();

          const cardDisplay = clickedItem.querySelector('.projects_item_display');
          const cardImg = cardDisplay?.querySelector('.projects_visual_img');
          const cardRect = (cardImg || cardDisplay || clickedItem).getBoundingClientRect();

          /* — Don't hide original yet — */
          const originalOpacity = element.style.opacity;

          const modalWrap = document.createElement('div');
          const overlay = document.createElement('div');
          const modal = document.createElement('div');

          modalWrap.classList.add('modal_wrap', 'background-color-white');
          Object.assign(modalWrap.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '1005',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          });
          modalWrap.setAttribute('data-lenis-prevent', '');

          Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '999',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            opacity: '0',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          });

          modal.classList.add('modal');
          modal.innerHTML = clickedItem.innerHTML;
          modal.setAttribute('data-lenis-prevent', '');

          // Force all images in the modal to load eagerly
          modal.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.loading = 'eager';
            const src = img.src;
            img.src = '';
            img.src = src;
          });

          const display = modal.querySelector('.projects_item_display');
          const content = modal.querySelectorAll('.projects_item_content');
          const indication = display?.querySelectorAll('.projects_modal_indication');
          const thumbnail = modal.querySelector('.projects_item_cover-img');
          const closeBtn = modal.querySelector('.projects_modal-close_btn');

          const targetTop = window.innerHeight * 0.05;
          const targetLeft = (100 - targetWidthPct) / 2;

          Object.assign(modal.style, {
            position: 'absolute',
            zIndex: '1000',
            top: `${targetTop / 16}rem`,
            left: `${targetLeft}%`,
            width: `${targetWidthPct}%`,
            height: 'max-content',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            opacity: '0',
            visibility: 'hidden',
            willChange: 'transform, opacity',
          });

          if (thumbnail) thumbnail.style.opacity = '0';
          if (display) {
            display.style.backgroundColor = '#FFFFFF';
            display.style.opacity = '0';
          }

          content.forEach(c => {
            c.style.opacity = '0';
            c.style.transform = 'translateY(2rem)';
          });
          if (indication)
            indication.forEach(ind => {
              ind.style.opacity = '0';
            });

          document.body.appendChild(modalWrap);
          modalWrap.appendChild(overlay);
          modalWrap.appendChild(modal);

          /* — Phantom clone — */
          const phantom = document.createElement('div');
          const phantomImg = (cardImg || cardDisplay).cloneNode(true);

          Object.assign(phantom.style, {
            position: 'fixed',
            zIndex: '1001',
            top: `${cardRect.top / 16}rem`,
            left: `${cardRect.left / 16}rem`,
            width: `${cardRect.width / 16}rem`,
            height: `${cardRect.height / 16}rem`,
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 4px 30px rgba(12, 0, 46, 0.25)',
            willChange: 'top, left, width, height, border-radius, box-shadow, opacity',
            pointerEvents: 'none',
          });

          Object.assign(phantomImg.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            position: 'absolute',
            inset: '0',
          });
          phantomImg.className = '';
          if (phantomImg.loading) phantomImg.loading = 'eager';
          phantom.appendChild(phantomImg);
          document.body.appendChild(phantom);

          // Ensure phantom is rendered before hiding original
          await new Promise(r => requestAnimationFrame(r));

          /* — Step 1: Show overlay first — */
          // startBackdropLoop();
          // animateBackdrop(0, 1, 500);
          overlay.style.opacity = '1';
          const navbar = document.querySelector('.nav_wrap');
          if (navbar) {
            navbar.style.opacity = '0';
            navbar.style.pointerEvents = 'none';
          }
          await new Promise(r => requestAnimationFrame(r));

          /* — Measure target — */
          modal.style.visibility = 'hidden';
          modal.style.opacity = '0';
          await new Promise(r => requestAnimationFrame(r));

          const modalDisplay = modal.querySelector('.projects_item_display');
          const modalRect = modalDisplay.getBoundingClientRect();

          const flyStart = {
            top: cardRect.top,
            left: cardRect.left,
            width: cardRect.width,
            height: cardRect.height,
            radius: 12,
          };
          const flyEnd = {
            top: modalRect.top,
            left: modalRect.left,
            width: modalRect.width,
            height: modalRect.height,
            radius: 16,
          };

          /* — Step 2: Fly phantom — */
          animateValue(0, 1, 500, cubicOut, p => {
            phantom.style.top = lerp(flyStart.top, flyEnd.top, p) / 16 + 'rem';
            phantom.style.left = lerp(flyStart.left, flyEnd.left, p) / 16 + 'rem';
            phantom.style.width = lerp(flyStart.width, flyEnd.width, p) / 16 + 'rem';
            phantom.style.height = lerp(flyStart.height, flyEnd.height, p) / 16 + 'rem';
            phantom.style.borderRadius = lerp(flyStart.radius, flyEnd.radius, p) + 'px';
            const shadowSize = lerp(15, 60, p);
            phantom.style.boxShadow = `0 ${shadowSize * 0.4}px ${shadowSize}px rgba(12, 0, 46, ${lerp(0.25, 0.45, p)})`;
          });

          // Small delay then hide original
          await new Promise(r => setTimeout(r, 80));
          element.style.transition = 'none';
          element.style.opacity = '0';

          await animateValue(0, 1, 500, cubicOut, () => {});

          /* — Step 3: Modal fade in (display area hidden) — */
          modal.style.visibility = 'visible';
          modal.style.transform = 'scale(0.97) translateY(8px)';
          modal.style.opacity = '0';

          await animateValue(0, 1, 300, cubicOut, p => {
            const scale = 0.97 + p * 0.03;
            const translateY = (1 - p) * 8;
            modal.style.transform = `scale(${scale}) translateY(${translateY}px)`;
            modal.style.opacity = String(p);
            modal.style.borderRadius = lerp(20, 16, p) + 'px';
            const shadowSize = p * 60;
            modal.style.boxShadow = `0 ${shadowSize * 0.4}px ${shadowSize}px rgba(12, 0, 46, ${p * 0.35})`;
          });

          /* — Step 4: Crossfade swap — */
          if (display) {
            display.style.transition = 'none';
            display.style.opacity = '1';
          }

          if (display) display.offsetHeight;

          phantom.style.transition = 'opacity 0.18s ease-out';
          phantom.style.opacity = '0';
          await new Promise(r => setTimeout(r, 200));

          if (phantom.parentNode) phantom.remove();

          modal.style.transform = 'none';

          /* — Step 5: Stagger content — */
          content.forEach((c, i) => {
            setTimeout(
              () => {
                c.style.transition =
                  'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
                c.style.opacity = '1';
                c.style.transform = 'translateY(0)';
              },
              100 + i * 180
            );
          });

          if (indication) {
            setTimeout(() => {
              indication.forEach(ind => {
                ind.style.transition = 'opacity 0.6s ease';
                ind.style.opacity = '1';
              });
            }, 350);
          }

          const updateOverlayHeight = () => {
            const overlayHeight = Math.max(
              modal.offsetHeight + window.innerHeight * 0.1,
              window.innerHeight
            );
            overlay.style.position = 'absolute';
            overlay.style.height = overlayHeight / 16 + 'rem';
          };
          updateOverlayHeight();
          const resizeObs = new ResizeObserver(updateOverlayHeight);
          resizeObs.observe(modal);

          /* ─── Close ─── */
          let closing = false;

          const closeModal = async () => {
            if (closing) return;
            closing = true;
            resizeObs.disconnect();

            try {
              modalWrap.scrollTo({ top: 0, behavior: 'smooth' });
              await new Promise(r => setTimeout(r, 380));

              content.forEach(c => {
                c.style.transition = 'opacity 0.3s ease, transform 0.35s ease';
                c.style.opacity = '0';
                c.style.transform = 'translateY(1rem)';
              });
              if (indication)
                indication.forEach(ind => {
                  ind.style.transition = 'opacity 0.25s ease';
                  ind.style.opacity = '0';
                });
              if (display) {
                display.style.transition = 'background-color 0.35s ease';
                display.style.backgroundColor = '#ededed';
              }

              await new Promise(r => setTimeout(r, 320));

              modalWrap.style.overflowY = 'hidden';
              overlay.style.position = 'fixed';
              overlay.style.height = '100vh';

              const currentH = modal.offsetHeight;
              modal.style.height = currentH / 16 + 'rem';
              modal.offsetHeight;

              if (_material) animateBackdrop(1, 0, 700);

              await animateValue(0, 1, 500, cubicInOut, p => {
                const scale = 1 - p * 0.08;
                const translateY = p * 20;
                modal.style.transform = `scale(${scale}) translateY(${translateY}px)`;
                modal.style.opacity = String(1 - p);
                modal.style.borderRadius = 16 + p * 4 + 'px';
                const shadowSize = (1 - p) * 60;
                modal.style.boxShadow = `0 ${shadowSize * 0.4}px ${shadowSize}px rgba(12, 0, 46, ${(1 - p) * 0.35})`;
              });

              overlay.style.transition = 'opacity 0.45s ease';
              overlay.style.opacity = '0';

              await new Promise(r => setTimeout(r, 450));
            } finally {
              // Always runs even if an animation step throws
              element.style.transition = 'opacity 0.5s ease';
              element.style.opacity = originalOpacity || '1';

              if (_raf) stopBackdropLoop();
              if (_canvas) hideCanvas();

              document.body.style.overflow = '';
              if (lenis) lenis.start();
              if (modalWrap.parentNode) document.body.removeChild(modalWrap);
              if (navbar) {
                navbar.style.pointerEvents = '';
                let lastY = window.scrollY;
                const releaseNavbar = () => {
                  if (window.scrollY < lastY - 5) {
                    navbar.style.opacity = '';
                    window.removeEventListener('scroll', releaseNavbar);
                    if (lenis) lenis.off('scroll', releaseNavbar);
                  }
                  lastY = window.scrollY;
                };
                window.addEventListener('scroll', releaseNavbar, { passive: true });
                if (lenis) lenis.on('scroll', releaseNavbar);
              }
            }
          };

          overlay.addEventListener('click', closeModal);
          if (indication) indication.forEach(ind => ind.addEventListener('click', closeModal));
          if (closeBtn) closeBtn.addEventListener('click', closeModal);
          document.addEventListener('keydown', function esc(ev) {
            if (ev.key === 'Escape') {
              closeModal();
              document.removeEventListener('keydown', esc);
            }
          });
        });
      });
    };

    initThreeBackdrop();

    return () => {
      mounted = false;
      // Cleanup event listeners? The click handlers are attached to elements that remain in DOM.
      // We could store references, but it's okay to leave them because they are on projectItems
      // which are still present. However, we need to clean up Three.js resources.
      cleanupFns.forEach(fn => fn());
      if (_raf) cancelAnimationFrame(_raf);
      if (_canvas && _canvas.parentNode) _canvas.remove();
      // Remove the style element? Keep it for future modals.
    };
  }, [lenis]);
}
