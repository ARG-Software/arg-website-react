import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { PillButton } from '@ui/pills/Pill.jsx';
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

export function LoadingScreen({ onComplete }) {
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const uiRefs = useRef([]);
  const exitTlRef = useRef(null);
  const frameRef = useRef(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // The video ends on the hero's own background and blob: fade the UI, then the loader over
  // the hero.
  const reveal = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(frameRef.current);
    setProgress(100);

    exitTlRef.current = gsap
      .timeline({ onComplete: () => onCompleteRef.current?.() })
      .to(uiRefs.current, { opacity: 0, duration: 0.4, ease: 'power2.out' })
      .to(overlayRef.current, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 0.2);
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
    <div className="ls-overlay" ref={overlayRef} aria-hidden="true">
      <video className="ls-video" ref={videoRef} autoPlay muted playsInline preload="auto">
        <source src="/videos/intro.mp4" type="video/mp4" />
      </video>

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
  );
}
