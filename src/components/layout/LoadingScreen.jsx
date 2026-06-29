import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { isMobile } from '../../utils/helpers';
import { arrowSvg } from '../icons/SocialIcons';
import { PillButton } from '../pills/Pill';
import '../../styles/loadingscreen.css';

const COLORS = ['#F0060D', '#C924D7', '#7904FD'];
const VIDEO_VISIBLE_DURATION = 12;
const INTRO_DURATION = 1.65;
const COUNTER_DURATION = VIDEO_VISIBLE_DURATION - INTRO_DURATION;

const GREETINGS = [
  'Olá',
  'Hola',
  'Bonjour',
  'Hello',
  '你好',
  'こんにちは',
  'Ciao',
  'Hallo',
  'مرحبا',
  'नमस्ते',
  'Hoi',
  'Hej',
  'Merhaba',
  'Cześć',
];

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function LoadingScreen({ onComplete }) {
  const bgRef = useRef(null);
  const videoRef = useRef(null);
  const letterRefs = useRef([]);
  const counterRef = useRef(null);
  const panelsRef = useRef([]);
  const [dots, setDots] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleGreetings = useMemo(() => {
    const shuffled = shuffle(GREETINGS);
    const mobile = isMobile();
    return mobile ? shuffled.slice(0, 8) : shuffled;
  }, []);

  const masterTlRef = useRef(null);

  const handleSkip = useCallback(() => {
    if (masterTlRef.current) {
      masterTlRef.current.kill();
    }
    if (counterRef.current) {
      counterRef.current.textContent = '100%';
    }
    const skipTl = gsap.timeline({ onComplete: () => onComplete?.() });
    skipTl
      .set(bgRef.current, { opacity: 1 })
      .fromTo(
        panelsRef.current[0],
        { yPercent: 200 },
        { yPercent: 0, duration: 0.8, ease: 'expo.out' }
      )
      .fromTo(
        panelsRef.current[1],
        { yPercent: 200 },
        { yPercent: 0, duration: 0.8, ease: 'expo.out' },
        '<0.12'
      )
      .fromTo(
        panelsRef.current[2],
        { yPercent: 200 },
        { yPercent: 0, duration: 0.8, ease: 'expo.out' },
        '<'
      )
      .set(bgRef.current, { opacity: 0 })
      .to(panelsRef.current, { yPercent: -100, duration: 0.8, ease: 'expo.out' });
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev % 3) + 1);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pillInterval = Math.round((VIDEO_VISIBLE_DURATION * 1000) / visibleGreetings.length);
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % visibleGreetings.length);
    }, pillInterval);
    return () => clearInterval(interval);
  }, [visibleGreetings]);

  useEffect(() => {
    document.documentElement.classList.add('ls-active');

    gsap.set(bgRef.current, { opacity: 1 });
    gsap.set(counterRef.current, { opacity: 1 });
    gsap.set(letterRefs.current, { yPercent: 100 });
    gsap.set(panelsRef.current, { yPercent: 200 });

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    const masterTl = gsap.timeline({ onComplete: () => onComplete?.() });
    masterTlRef.current = masterTl;

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
      duration: COUNTER_DURATION,
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

    const handleKeyDown = e => {
      if (e.key === 'Escape') handleSkip();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('ls-active');
      document.removeEventListener('keydown', handleKeyDown);
      masterTl.kill();
    };
  }, [onComplete, handleSkip]);

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
        <div data-autoplay="true" data-loop="true" className="ambient-bg-video ls-bg-video">
          <video ref={videoRef} autoPlay loop muted playsInline>
            <source src="videos/intro.mp4" />
          </video>
        </div>
        <div className="ls-hello-row" data-animate-order="0">
          {visibleGreetings.map((word, i) => (
            <span key={word} className={`ls-hello${i === activeIndex ? ' is-active' : ''}`}>
              {word}
            </span>
          ))}
        </div>
        <PillButton
          variant="glass"
          active
          size="sm"
          className="ls-skip"
          onClick={handleSkip}
          iconAfter={
            <span className="arrow_icon-embed ls-skip-arrow" aria-hidden="true">
              {arrowSvg}
            </span>
          }
        >
          Skip Intro
        </PillButton>
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
