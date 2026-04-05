import { useEffect } from 'react';

export function InfinityMarquee({ className = '' }) {
  // Inlined useInfiniteMarquee hook
  useEffect(() => {
    const section = document.querySelector('.section_infinity');
    if (!section) return;

    const lists = section.querySelectorAll('.infinity_list');
    if (!lists.length) return;

    const TEXT_WIDTH = lists[0].scrollWidth;
    const NORMAL_SPEED = 100;
    const SLOW_SPEED = 20;
    const currentSpeed = { value: NORMAL_SPEED };
    let position = 0;
    let rafId = null;
    let lastTime = null;

    const tick = timestamp => {
      if (lastTime === null) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      position += delta * (currentSpeed.value / 1000);

      if (position >= TEXT_WIDTH) {
        position = 0;
      }

      lists.forEach(list => {
        list.style.transform = `translateX(${-position / 16}rem)`;
      });

      rafId = requestAnimationFrame(tick);
    };

    const setSpeed = speed => {
      currentSpeed.value = speed;
    };

    section.addEventListener('mouseenter', () => setSpeed(SLOW_SPEED));
    section.addEventListener('mouseleave', () => setSpeed(NORMAL_SPEED));

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      section.removeEventListener('mouseenter', () => setSpeed(SLOW_SPEED));
      section.removeEventListener('mouseleave', () => setSpeed(NORMAL_SPEED));
    };
  }, []);

  return (
    <div className={`section_infinity background-color-gray overflow-hidden ${className}`.trim()}>
      <div className="infinity_list">
        <p className="infinity_text">
          {' '}
          Custom Software • SaaS Development • Server Infrastructure • Prototyping • AI • MVP •
          Backend Development • Frontend Development •{' '}
        </p>
      </div>
      <div className="infinity_list">
        <p className="infinity_text">
          {' '}
          Custom Software • SaaS Development • Server Infrastructure • Prototyping • AI • MVP •
          Backend Development • Frontend Development •{' '}
        </p>
      </div>
    </div>
  );
}
