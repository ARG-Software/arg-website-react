import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import '../../styles/loadingscreen.css';

const COLORS = ['#F0060D', '#C924D7', '#7904FD'];

export function LoadingScreen({ onComplete }) {
  const bgRef = useRef(null);
  const letterRefs = useRef([]);
  const counterRef = useRef(null);
  const panelsRef = useRef([]);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev % 3) + 1);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('ls-active');

    gsap.set(bgRef.current, { opacity: 1 });
    gsap.set(counterRef.current, { opacity: 1 });
    gsap.set(letterRefs.current, { yPercent: 100 });
    gsap.set(panelsRef.current, { yPercent: 200 });

    const masterTl = gsap.timeline({ onComplete: () => onComplete?.() });

    masterTl.fromTo(
      letterRefs.current,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 0.75,
        stagger: { amount: 0.3, from: 'random' },
        delay: 0.6,
        ease: 'circ.out',
      }
    );

    const counterObj = { val: 0 };
    masterTl.to(counterObj, {
      val: 100,
      duration: 3,
      ease: 'none',
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = Math.round(counterObj.val) + '%';
        }
      },
    });

    masterTl
      .fromTo(
        panelsRef.current[0],
        { yPercent: 200 },
        { yPercent: 0, duration: 1, ease: 'expo.out' }
      )
      .fromTo(
        panelsRef.current[1],
        { yPercent: 200 },
        { yPercent: 0, duration: 1, ease: 'expo.out' },
        '<0.18'
      )
      .fromTo(
        panelsRef.current[2],
        { yPercent: 200 },
        { yPercent: 0, duration: 1, ease: 'expo.out' },
        '<'
      )
      // All panels now cover the screen — hide the dark bg so hero shows through as panels exit
      .set(bgRef.current, { opacity: 0 })
      .to(panelsRef.current, { yPercent: -100, duration: 1, ease: 'expo.out' });

    return () => {
      document.documentElement.classList.remove('ls-active');
      masterTl.kill();
    };
  }, [onComplete]);

  return (
    <div
      className="ls-overlay"
      aria-hidden="true"
      data-animate-scope
      data-animate-default-preset="fade-up"
      data-animate-default-trigger="load"
      data-animate-default-stagger="200"
    >
      <div className="ls-bg" ref={bgRef}>
        <div className="ls-hello-row" data-animate-order="0">
          <span className="ls-hello">Olá</span>
          <span className="ls-hello">Hola</span>
          <span className="ls-hello">Bonjour</span>
          <span className="ls-hello">Hello</span>
          <span className="ls-hello">你好</span>
          <span className="ls-hello">こんにちは</span>
          <span className="ls-hello">Ciao</span>
          <span className="ls-hello">Hallo</span>
        </div>
        <div className="ls-label">
          <span className="ls-letter-wrap" data-animate-order="1">
            <span className="ls-letter">scaling</span>
          </span>

          <span data-animate-order="2" className="ls-dots">
            {'.'.repeat(dots)}
          </span>
        </div>
        <div className="ls-counter" ref={counterRef} data-animate-order="1">
          0%
        </div>
      </div>
      <div className="ls-panels">
        {COLORS.map((color, i) => (
          <div
            key={color}
            ref={el => (panelsRef.current[i] = el)}
            className="ls-panel"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
