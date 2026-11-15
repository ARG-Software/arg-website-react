import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { PillButton } from '@ui/pills/Pill.jsx';
import { prefersReducedMotion } from '@utils/helpers';
import '../../styles/loadingscreen.css';

// Used only when the video cannot play: the timed sequence lasts as long as the video does.
const FALLBACK_DURATION_MS = 10000;
const VIDEO_START_TIMEOUT_MS = 2500;
// The video plays at VIDEO_OPACITY (as in the CSS) and, over its last seconds, fades to the
// hero's own video opacity, so its final blob is as faint as the hero's.
const VIDEO_OPACITY = 0.35;
const HERO_VIDEO_OPACITY = 0.11;
const HERO_BLEND_S = 3;
// The page colour #0c002e, and what the hero makes of it with its near-white video at 11%.
const LOADER_RGB = [12, 0, 46];
const HERO_RGB = [37, 27, 68];
const STEPS = [
  { verb: 'parse', target: 'requirements.md', result: '12 specs' },
  { verb: 'map', target: 'src/modules', result: '38 modules' },
  { verb: 'resolve', target: 'dependencies', result: '214 pkgs' },
  { verb: 'scaffold', target: 'services/api', result: '6 services' },
  { verb: 'design', target: 'db/schema', result: '24 tables' },
  { verb: 'write', target: 'tests/unit', result: '312 cases' },
  { verb: 'build', target: 'tests/e2e', result: '48 flows' },
  { verb: 'run', target: 'test suite', result: '360 passed' },
  { verb: 'lint', target: 'src/**', result: '0 issues' },
  { verb: 'compile', target: 'assets', result: '1.2 MB' },
  { verb: 'optimize', target: 'queries', result: '-38% p95' },
  { verb: 'provision', target: 'infra/eu-west', result: '3 regions' },
  { verb: 'secure', target: 'endpoints', result: 'TLS · OAuth' },
  { verb: 'ship', target: 'v1.0.0', result: 'live' },
];

export function LoadingScreen({ onReveal, onComplete }) {
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const burstRef = useRef(null);
  const coreRef = useRef(null);
  const uiRefs = useRef([]);
  const exitTlRef = useRef(null);
  const frameRef = useRef(0);
  const finishedRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  const onCompleteRef = useRef(onComplete);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    onRevealRef.current = onReveal;
    onCompleteRef.current = onComplete;
  }, [onReveal, onComplete]);

  // The video ends on the hero's own background and blob. The blob lights up and collapses
  // into a bright core, the core bursts into a ring in the brand gradient that races past the
  // screen edges, and the loader drops away at the burst. The hero starts while the ring is
  // still expanding (onReveal); the loader unmounts once the ring is gone (onComplete).
  const reveal = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(frameRef.current);
    setProgress(100);
    overlayRef.current.style.pointerEvents = 'none';

    const tl = gsap
      .timeline({ onComplete: () => onCompleteRef.current?.() })
      .to(uiRefs.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });

    if (prefersReducedMotion()) {
      tl.to(overlayRef.current, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 0.2).call(() =>
        onRevealRef.current?.()
      );
    } else {
      // Wide enough that the ring clears the corners of the screen
      const coverSize = Math.hypot(window.innerWidth, window.innerHeight) * 1.15;
      tl.fromTo(
        coreRef.current,
        { opacity: 0, scale: 1 },
        { opacity: 0.7, duration: 0.25, ease: 'power1.in' },
        0
      )
        .to(coreRef.current, { opacity: 1, scale: 0.4, duration: 0.2, ease: 'power3.in' }, 0.25)
        .set(burstRef.current, { opacity: 1 }, 0.45)
        .to(coreRef.current, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.out' }, 0.45)
        .to(
          burstRef.current,
          { width: coverSize, height: coverSize, duration: 1.15, ease: 'power2.out' },
          0.45
        )
        .to(overlayRef.current, { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0.45)
        .call(() => onRevealRef.current?.(), null, 0.7)
        .to(burstRef.current, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 1.3);
    }
    exitTlRef.current = tl;
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('ls-active');
    finishedRef.current = false;

    const video = videoRef.current;
    const source = video?.querySelector('source');
    const startedAt = performance.now();
    let useTimer = !video;
    let shown = 0;

    const fallBackToTimer = () => {
      useTimer = true;
    };

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      if (!useTimer && video.currentTime === 0 && elapsed > VIDEO_START_TIMEOUT_MS) {
        useTimer = true;
      }

      let ratio = 0;
      if (useTimer) {
        ratio = elapsed / FALLBACK_DURATION_MS;
      } else if (Number.isFinite(video.duration) && video.duration > 0) {
        ratio = video.currentTime / video.duration;
        const t = Math.min(1, Math.max(0, 1 - (video.duration - video.currentTime) / HERO_BLEND_S));
        const eased = t * t * (3 - 2 * t);
        video.style.opacity = VIDEO_OPACITY + (HERO_VIDEO_OPACITY - VIDEO_OPACITY) * eased;
        const rgb = LOADER_RGB.map((c, i) => Math.round(c + (HERO_RGB[i] - c) * eased));
        overlayRef.current.style.backgroundColor = `rgb(${rgb.join(', ')})`;
      }
      const value = Math.max(shown, Math.min(100, Math.floor(ratio * 100)));
      if (value !== shown) {
        shown = value;
        setProgress(value);
      }

      if (ratio >= 1) {
        reveal();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    if (video) {
      video.addEventListener('ended', reveal);
      video.addEventListener('error', fallBackToTimer);
      source?.addEventListener('error', fallBackToTimer);
      video.currentTime = 0;
      video.play().catch(fallBackToTimer);
    }
    frameRef.current = requestAnimationFrame(tick);

    const handleKeyDown = e => {
      if (e.key === 'Escape') reveal();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('ls-active');
      document.removeEventListener('keydown', handleKeyDown);
      video?.removeEventListener('ended', reveal);
      video?.removeEventListener('error', fallBackToTimer);
      source?.removeEventListener('error', fallBackToTimer);
      cancelAnimationFrame(frameRef.current);
      exitTlRef.current?.kill();
    };
  }, [reveal]);

  const filledSegments = Math.floor((progress / 100) * STEPS.length);
  const stepIndex = Math.min(STEPS.length - 1, filledSegments);
  const shownSteps = STEPS.slice(0, stepIndex + 1);

  return (
    <>
      <div className="ls-overlay" ref={overlayRef} aria-hidden="true">
        <video
          className="ls-video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/videos/intro-poster.webp"
        >
          <source src="/videos/intro.mp4" type="video/mp4" />
        </video>

        {/* Lights up over the blob at the end, then collapses into the core the ring bursts from */}
        <div className="ls-core" ref={coreRef} />

        <div className="ls-top" ref={el => (uiRefs.current[0] = el)}>
          <PillButton
            variant="glass"
            active
            size="sm"
            className="ls-skip"
            onClick={reveal}
            iconAfter={<kbd className="ls-skip-key">Esc</kbd>}
          >
            Skip intro
          </PillButton>
        </div>

        <div className="ls-bottom" ref={el => (uiRefs.current[1] = el)}>
          <div className="ls-status">
            {/* A running pipeline: finished steps stay listed, the newest one runs at the bottom */}
            <ol className="ls-log">
              {shownSteps.map((item, i) => {
                const running = i === stepIndex && progress < 100;
                return (
                  <li key={item.verb} className={running ? 'is-running' : undefined}>
                    <span className="ls-log-mark">{running ? '→' : '✓'}</span>
                    <span className="ls-log-verb">{item.verb}</span>
                    <span>{item.target}</span>
                    <span className="ls-log-result">{running ? 'running' : item.result}</span>
                  </li>
                );
              })}
            </ol>
            <span className="ls-status-word">
              scaling
              <span className="ls-status-dots">
                <span />
                <span />
                <span />
              </span>
            </span>
          </div>
          <div className="ls-percent">
            {progress}
            <span className="ls-percent-sign">%</span>
          </div>
          <div className="ls-segments">
            {STEPS.map((item, i) => (
              <span
                key={item.verb}
                className={`ls-segment${i < filledSegments ? ' is-filled' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Outside the overlay, so the overlay fading out does not fade the ring with it */}
      <div className="ls-burst" ref={burstRef} aria-hidden="true" />
    </>
  );
}
