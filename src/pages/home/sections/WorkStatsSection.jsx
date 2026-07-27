import { useEffect } from 'react';
import AppLink from '../../../components/navigation/AppLink';
import { CounterWidget } from '../../../components/widgets/CounterWidget';
import { SectionDivider } from '../../../components/layout/SectionDivider';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { isMobile } from '../../../utils/helpers';
import HOMEPAGE from '../../../data/homePage.json';

export function WorkStatsSection({ className = '', content = HOMEPAGE.workStats }) {
  // Inlined useImageHoverEffects hook
  useEffect(() => {
    const mobile = isMobile();
    const items = document.querySelectorAll('.work_items-wrapper .work-item');
    const cleanupFns = [];

    items.forEach(item => {
      const wrapper = item.querySelector('.work_image-wrapper');
      if (!wrapper) return;
      const imgEl = wrapper.querySelector('.work-image');
      if (!imgEl) return;

      item.style.position = 'relative';

      if (mobile) {
        // Mobile: always visible, right-aligned
        wrapper.classList.remove('work_image-wrapper');
        wrapper.classList.add('work_image-mobile');
        Object.assign(wrapper.style, {
          position: 'absolute',
          right: '0',
          top: '5rem',
          left: 'auto',
          width: 'auto',
          height: 'auto',
          display: 'block',
          opacity: '1',
          pointerEvents: 'none',
          zIndex: '0',
        });
        Object.assign(imgEl.style, {
          width: 'auto',
          height: '9rem',
          objectFit: 'contain',
          display: 'block',
          opacity: '1',
          marginTop: '-4rem',
        });
      } else {
        // Desktop: sophisticated mouse tracking hover effect
        const FADE = '0.4s ease';
        const SIZE = 160;
        const HALF = SIZE / 2;
        const LERP = 0.08;

        wrapper.classList.remove('work_image-wrapper');
        wrapper.classList.add('work_image-hover');

        item.style.overflow = 'visible';
        item.style.cursor = 'default';

        Object.assign(wrapper.style, {
          position: 'absolute',
          width: SIZE / 16 + 'rem',
          height: SIZE / 16 + 'rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: '0',
          pointerEvents: 'none',
          zIndex: '0',
          transform: 'translate(-50%, -50%)',
          transition: 'opacity ' + FADE,
          willChange: 'left, top',
        });

        Object.assign(imgEl.style, {
          width: '100%',
          height: '100%',
          maxWidth: SIZE / 16 + 'rem',
          maxHeight: SIZE / 16 + 'rem',
          objectFit: 'contain',
          opacity: '1',
          display: 'block',
          transform: 'scale(0.85)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        });

        let mouseX = 0,
          mouseY = 0;
        let currentX = 0,
          currentY = 0;
        let rafId = null;
        let isHovering = false;

        const clamp = (rawX, rawY, w, h) => {
          const rightEdge = w - HALF;
          const leftBound = w * 0.5;
          const range = rightEdge - leftBound;
          const normalizedX = Math.max(0, Math.min(1, rawX / w));
          const biased = Math.sqrt(normalizedX);
          const x = leftBound + biased * range;
          const y = Math.max(0, Math.min(rawY, h));
          return { x, y };
        };

        const tick = () => {
          if (!isHovering) {
            rafId = null;
            return;
          }

          const rect = item.getBoundingClientRect();
          const { x: tx, y: ty } = clamp(mouseX, mouseY, rect.width, rect.height);

          currentX += (tx - currentX) * LERP;
          currentY += (ty - currentY) * LERP;

          wrapper.style.left = currentX / 16 + 'rem';
          wrapper.style.top = currentY / 16 + 'rem';

          rafId = requestAnimationFrame(tick);
        };

        const handleMouseEnter = e => {
          isHovering = true;
          const rect = item.getBoundingClientRect();
          mouseX = e.clientX - rect.left;
          mouseY = e.clientY - rect.top;

          const { x, y } = clamp(mouseX, mouseY, rect.width, rect.height);
          currentX = x;
          currentY = y;
          wrapper.style.left = x / 16 + 'rem';
          wrapper.style.top = y / 16 + 'rem';
          wrapper.style.opacity = '1';
          imgEl.style.transform = 'scale(1)';

          if (!rafId) rafId = requestAnimationFrame(tick);
        };

        const handleMouseMove = e => {
          const rect = item.getBoundingClientRect();
          mouseX = e.clientX - rect.left;
          mouseY = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
          isHovering = false;
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          wrapper.style.opacity = '0';
          imgEl.style.transform = 'scale(0.85)';
        };

        item.addEventListener('mouseenter', handleMouseEnter);
        item.addEventListener('mousemove', handleMouseMove);
        item.addEventListener('mouseleave', handleMouseLeave);

        cleanupFns.push(() => {
          item.removeEventListener('mouseenter', handleMouseEnter);
          item.removeEventListener('mousemove', handleMouseMove);
          item.removeEventListener('mouseleave', handleMouseLeave);
          if (rafId) cancelAnimationFrame(rafId);
        });
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }, []);

  return (
    <section
      id="working-with-us"
      className={`section_work background-color-white padding-section-large border-radius-top ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-preset="fade-up"
      data-animate-default-stagger="140"
    >
      <div className="padding-global">
        <div className="container-medium">
          <div className="work-component">
            <div id="workstats-subtitle-grid" data-animate-order="0">
              <div className="subtitle_tag-wrapper hide-mobile-landscape">{content.eyebrow}</div>
            </div>
            <div className="work-content">
              <div className="work_header-wrapper">
                <div className="heading_wrap">
                  <h2 data-animate="fade-up" data-animate-order="1" className="home-section-title">
                    {content.title}
                  </h2>
                </div>
                <div className="padding-bottom padding-30-44"></div>
                <p className="text-color-grey" data-animate="fade-up" data-animate-order="2">
                  {content.paragraphs[0]}
                </p>
                <p className="text-color-grey" data-animate="fade-up" data-animate-order="3">
                  {content.paragraphs[1]}
                </p>
                <div className="home-work__cta" data-animate="fade-up" data-animate-order="4">
                  <AppLink to="/working-with-us/" className="text-button">
                    <div className="text-button_list is-dark">
                      <div className="text-button_text text-no-wrap">{content.cta.label}</div>
                      <div className="arrow_icon-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text text-no-wrap">{content.cta.hoverLabel}</div>
                      <div className="arrow_icon-embed">{arrowSvg}</div>
                    </div>
                  </AppLink>
                </div>
              </div>
              <div className="padding-bottom padding-80-76"></div>
              <div className="work_items-wrapper" data-animate-scope data-animate-trigger="scroll">
                {content.stats.map((stat, index) => (
                  <CounterWidget
                    key={index}
                    value={stat.value}
                    label={stat.label}
                    imageSrc={stat.imageSrc}
                    variant="expanded"
                    data-animate-order={index}
                  />
                ))}
              </div>
              <div className="home-work__footer" data-animate="fade-up" data-animate-order="5">
                <AppLink to="/working-with-us/" className="text-button text-button--align-end">
                  <div className="text-button_list is-dark">
                    <div className="text-button_text text-no-wrap">{content.cta.label}</div>
                    <div className="arrow_icon-embed">{arrowSvg}</div>
                  </div>
                  <div className="text-button_list is-animated is-dark">
                    <div className="text-button_text text-no-wrap">{content.cta.hoverLabel}</div>
                    <div className="arrow_icon-embed">{arrowSvg}</div>
                  </div>
                </AppLink>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SectionDivider variant="default" hideOnMobile={false} />
    </section>
  );
}
