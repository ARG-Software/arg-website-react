import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@utils/helpers';

const AUTOPLAY_MS = 5000;
const PAUSE_LABEL = 'Pause the slideshow';
const PLAY_LABEL = 'Play the slideshow';
const WHEEL_STEP_MS = 700;
const SWIPE_PX = 50;
const MAX_BEHIND = 2;
const SCORE_LOOP = [86, 71, 55, 34, 92];

const easeOutQuart = t => 1 - (1 - t) ** 4;
const easeInOutCubic = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

function cardStyle(position) {
  if (position < 0) {
    return { transform: 'translateY(-115%) rotate(-3deg)', opacity: 0, zIndex: 10 };
  }
  return {
    transform: `translateY(${-position * 18}px) scale(${1 - position * 0.045})`,
    filter: `brightness(${1 - position * 0.12})`,
    opacity: position > MAX_BEHIND ? 0 : 1,
    zIndex: 10 - position,
  };
}

function ScoreCard({ active, bands }) {
  const [score, setScore] = useState(0);
  const [hoveredBand, setHoveredBand] = useState(null);
  const scoreRef = useRef(0);
  const introDone = useRef(false);
  const loopIndex = useRef(0);

  useEffect(() => {
    if (!active) {
      introDone.current = false;
      return undefined;
    }

    let frame;
    let timer;
    const tween = (to, duration, ease, done) => {
      const from = scoreRef.current;
      const start = performance.now();
      const step = now => {
        const t = Math.min((now - start) / duration, 1);
        scoreRef.current = from + (to - from) * ease(t);
        setScore(scoreRef.current);
        if (t < 1) frame = requestAnimationFrame(step);
        else done();
      };
      frame = requestAnimationFrame(step);
    };
    const loop = () => {
      const to = SCORE_LOOP[loopIndex.current % SCORE_LOOP.length];
      loopIndex.current += 1;
      tween(to, 1400, easeInOutCubic, () => {
        timer = setTimeout(loop, 1600);
      });
    };

    if (hoveredBand) {
      introDone.current = true;
      tween((hoveredBand.from + hoveredBand.to) / 2, 600, easeInOutCubic, () => {});
    } else if (prefersReducedMotion()) {
      tween(SCORE_LOOP[0], 1, easeOutQuart, () => {});
    } else if (!introDone.current) {
      scoreRef.current = 0;
      tween(100, 2600, easeOutQuart, () => {
        introDone.current = true;
        timer = setTimeout(loop, 1600);
      });
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [active, hoveredBand]);

  const rounded = Math.round(score);
  const band = bands.find(item => rounded < item.to) ?? bands[bands.length - 1];

  return (
    <div className="au-deck-score" style={{ '--au-band': band.color }}>
      <div className="au-deck-score-value">
        <span className="au-deck-score-number">{rounded}</span>
        <span className="au-deck-band">
          <span className="au-deck-band-dot" aria-hidden="true" />
          {band.label}
        </span>
      </div>

      <div className="au-deck-scale">
        <div className="au-deck-scale-ends" aria-hidden="true">
          <span>0</span>
          <span>100</span>
        </div>
        <div className="au-deck-scale-track" aria-hidden="true">
          <span
            className="au-deck-scale-fill"
            style={{ clipPath: `inset(0 ${100 - score}% 0 0 round 999px)` }}
          />
          <span className="au-deck-scale-knob" style={{ left: `${score}%` }} />
        </div>
        <ul className="au-deck-scale-bands">
          {bands.map(item => (
            <li
              key={item.label}
              className={item === band ? 'is-active' : undefined}
              style={{ '--au-segment': item.color, flexGrow: item.to - item.from }}
              onMouseEnter={() => setHoveredBand(item)}
              onMouseLeave={() => setHoveredBand(null)}
            >
              <span className="au-deck-mono">{item.range}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WeightsCard({ active, weights, noteLabel, note }) {
  const [hovered, setHovered] = useState(null);
  const offsets = weights.map((_, index) =>
    weights.slice(0, index).reduce((sum, item) => sum + item.weight, 0)
  );
  const dimClass = index => (hovered !== null && hovered !== index ? 'is-dim' : undefined);

  return (
    <div className="au-deck-weights">
      <div className={active ? 'au-deck-bar is-in' : 'au-deck-bar'} aria-hidden="true">
        {weights.map((item, index) => (
          <span
            key={item.name}
            className={dimClass(index)}
            style={{
              flexGrow: item.weight,
              backgroundSize: `${10000 / item.weight}% 100%`,
              backgroundPositionX: `${(offsets[index] / (100 - item.weight)) * 100}%`,
              transitionDelay: active ? `${index * 70}ms` : '0ms',
            }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      <ol className="au-deck-legend">
        {weights.map((item, index) => (
          <li
            key={item.name}
            className={dimClass(index)}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="au-deck-mono">{String(index + 1).padStart(2, '0')}</span>
            <span className="au-deck-legend-name">{item.name}</span>
            <span className="au-deck-leader" aria-hidden="true" />
            <span className="au-deck-mono">{item.weight}%</span>
          </li>
        ))}
      </ol>

      <p className="au-deck-note">
        <span className="au-deck-mono">{noteLabel}</span>
        {note}
      </p>
    </div>
  );
}

function StatesCard({ states }) {
  return (
    <dl className="au-deck-states">
      {states.map(state => (
        <div key={state.label}>
          <dt className="au-deck-mono">
            <span className={`au-deck-glyph au-deck-glyph--${state.glyph}`} aria-hidden="true" />
            {state.label}
          </dt>
          <dd>{state.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function NotesCard({ notes }) {
  return (
    <div className="au-deck-notes">
      {notes.map(note => (
        <div key={note.title}>
          <h4>{note.title}</h4>
          <p>{note.text}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportGuideDeck({ content }) {
  const count = content.cards.length;
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const deckRef = useRef(null);
  const stackRef = useRef(null);
  // The deck moves on by itself every few seconds while it is on screen, unless the visitor has
  // paused it, is pointing at it, or prefers reduced motion
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [inView, setInView] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const go = index => setCurrent(Math.max(0, Math.min(count - 1, index)));

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(deckRef.current);
    return () => observer.disconnect();
  }, []);

  // Restarts on every card change, so a manual move also gets the full five seconds
  useEffect(() => {
    if (!playing || !inView || hovering) return undefined;
    const timer = setTimeout(() => setCurrent(index => (index + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, inView, hovering, current, count]);

  // Wheel and touch move the deck instead of the page, and hand the gesture back to the
  // page (and Lenis) once the deck is at its first or last card.
  useEffect(() => {
    const stack = stackRef.current;
    let lastStep = 0;
    let touchStartY = null;

    const canMove = direction => {
      const next = currentRef.current + direction;
      return next >= 0 && next < count;
    };

    const onWheel = event => {
      const direction = Math.sign(event.deltaY);
      if (!direction) return;
      const now = performance.now();
      const throttled = now - lastStep < WHEEL_STEP_MS;
      if (!throttled && !canMove(direction)) return;
      event.preventDefault();
      event.stopPropagation();
      if (throttled) return;
      lastStep = now;
      setCurrent(currentRef.current + direction);
    };

    const onTouchStart = event => {
      touchStartY = event.touches[0].clientY;
    };

    const onTouchMove = event => {
      if (touchStartY === null) return;
      const direction = Math.sign(touchStartY - event.touches[0].clientY);
      if (direction && canMove(direction)) event.preventDefault();
    };

    const onTouchEnd = event => {
      if (touchStartY === null) return;
      const distance = touchStartY - event.changedTouches[0].clientY;
      touchStartY = null;
      const direction = Math.sign(distance);
      if (Math.abs(distance) > SWIPE_PX && canMove(direction)) {
        setCurrent(currentRef.current + direction);
      }
    };

    stack.addEventListener('wheel', onWheel, { passive: false });
    stack.addEventListener('touchstart', onTouchStart, { passive: true });
    stack.addEventListener('touchmove', onTouchMove, { passive: false });
    stack.addEventListener('touchend', onTouchEnd);
    return () => {
      stack.removeEventListener('wheel', onWheel);
      stack.removeEventListener('touchstart', onTouchStart);
      stack.removeEventListener('touchmove', onTouchMove);
      stack.removeEventListener('touchend', onTouchEnd);
    };
  }, [count]);

  const onKeyDown = event => {
    const isButton = event.target.closest('button');
    if (event.key === 'ArrowDown' || event.key === 'PageDown') go(current + 1);
    else if (event.key === 'ArrowUp' || event.key === 'PageUp') go(current - 1);
    else if (event.key === ' ' && !isButton) go(current + (event.shiftKey ? -1 : 1));
    else return;
    event.preventDefault();
  };

  const renderBody = (card, active) => {
    if (card.id === 'score') return <ScoreCard active={active} bands={content.bands} />;
    if (card.id === 'weights') {
      return (
        <WeightsCard
          active={active}
          weights={content.weights}
          noteLabel={content.weightsNoteLabel}
          note={content.weightsNote}
        />
      );
    }
    if (card.id === 'states') return <StatesCard states={content.states} />;
    return <NotesCard notes={content.notes} />;
  };

  return (
    <div
      ref={deckRef}
      className="au-deck"
      role="region"
      aria-roledescription="carousel"
      aria-label={content.title}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <h2 className="au-title au-deck-title" data-animate-order="0">
        {content.kicker}
        <br />
        <span className="text-color-gradiant">{content.title}</span>
      </h2>

      <div
        className="au-deck-stack"
        ref={stackRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {content.cards.map((card, index) => {
          const position = index - current;
          const isLast = index === count - 1;
          return (
            <article
              key={card.id}
              className={card.dark ? 'au-deck-card au-deck-card--dark' : 'au-deck-card'}
              style={cardStyle(position)}
              aria-hidden={position !== 0}
              inert={position !== 0 ? '' : undefined}
            >
              <div className="au-deck-card-head">
                <div>
                  <span className="au-deck-eyebrow">{card.eyebrow}</span>
                  <h3 className="au-deck-card-title">{card.title}</h3>
                </div>
              </div>

              <div className="au-deck-card-body">{renderBody(card, position === 0)}</div>

              <div className="au-deck-card-foot">
                <div className="au-deck-foot-meta">
                  <span className="au-deck-mono">
                    {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    className="au-deck-play"
                    aria-label={playing ? PAUSE_LABEL : PLAY_LABEL}
                    onClick={() => setPlaying(!playing)}
                  >
                    <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="au-deck-next"
                  onClick={() => go(isLast ? 0 : index + 1)}
                >
                  {card.next}
                  <span className="au-deck-next-icon" aria-hidden="true">
                    {isLast ? '↺' : '↓'}
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
