import { useEffect } from 'react';
import { CounterWidget } from '../../../components/widgets/CounterWidget';
import { SectionDivider } from '../../../components/layout/SectionDivider';

const STATS = [
  {
    value: '1000',
    label: 'Deploys into production, usually not on Friday',
    imageSrc: 'images/1e53a75c2842b62a1322f4990421622ffed676ba-810x810-402x.png',
  },
  {
    value: '2000',
    label: 'Finance transactions per second',
    imageSrc: 'images/219c903e193d94f2157d75b6bb23de9423d4208b-810x810-402x.png',
  },
  {
    value: '25',
    label: 'Years of experience combined',
    imageSrc: 'images/54cba1fec22e71214cc134de9a43525b198eafff-810x810-402x.png',
  },
  {
    value: '6',
    label: 'Impacted countries',
    imageSrc: 'images/d3a8639078eae63c50a075b928a37280e915ed53-1024x1024-402x.png',
  },
];

export function WorkStatsSection({ className = '' }) {
  // Inlined useImageHoverEffects hook
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const items = document.querySelectorAll('.work_items-wrapper .work-item');
    const cleanupFns = [];

    items.forEach(item => {
      const wrapper = item.querySelector('.work_image-wrapper');
      if (!wrapper) return;
      const imgEl = wrapper.querySelector('.work-image');
      if (!imgEl) return;

      item.style.position = 'relative';

      if (isMobile) {
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
      id="work-with-us"
      className={`section_work background-color-white padding-section-large ${className}`.trim()}
    >
      <div className="padding-global">
        <div className="container-medium">
          <div className="work-component">
            <div id="workstats-subtitle-grid">
              <div className="subtitle_tag-wrapper hide-mobile-landscape">Working With Us</div>
            </div>
            <div className="work-content">
              <div data-w-id="b5b23643-ebaf-8715-5680-66b9e17b988d" className="work_header-wrapper">
                <div className="overflow-hidden">
                  <div className="heading_wrap">
                    <h2
                      style={{
                        opacity: 0,
                        transform:
                          'translate3d(0, 250%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(10deg) skew(0, 0)',
                      }}
                      className="work_heading"
                    >
                      From Zero to Hero
                    </h2>
                  </div>
                </div>
                <div className="padding-bottom padding-30-44"></div>
                <p
                  style={{
                    transform:
                      'translate3d(0, 2rem, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                    opacity: 0,
                  }}
                  className="work_paragraph"
                >
                  By trusting us, you (always) end up winning. Even if we meet once in a lifetime,
                  you get a solid, lasting partnership where people come first. <br />
                  And each challenge, too.
                  <br />‍<br />
                  Once you decide to go on this adventure, know that your job always comes first.
                  Each client and challenge deserves everything we have, so we don't pile up tasks
                  but instead focus on increasing quality.
                  <br />
                  And yes, we answer fast. So, feel free to tell us what worries you during the
                  process.
                  <br />
                  <br />
                  Don't expect endless emails and calls. We'll discuss everything at the right time.
                  <br />
                  <br />
                  There's no micro-management, only a primary focus: meeting your goals and
                  deadlines.
                  <br />
                  One thing is sure: you'll always get a digital, battle-proof, scalable solution.
                  Expect an all-in team, ready to meet your expectations.
                </p>
              </div>
              <div className="padding-bottom padding-80-76"></div>
              <div className="work_items-wrapper">
                {STATS.map((stat, index) => (
                  <CounterWidget
                    key={index}
                    value={stat.value}
                    label={stat.label}
                    imageSrc={stat.imageSrc}
                    variant="expanded"
                    showLine={true}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SectionDivider variant="default" hideOnMobile={false} />
    </section>
  );
}
