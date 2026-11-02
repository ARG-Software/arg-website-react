import { useEffect, useId, useRef, useState } from 'react';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { Pill } from '@ui/pills/Pill.jsx';

// Ported from the ARG Architect audit overlay (buildCircuitBackground in browserrunneroverlay.ts).
// The original draws on a 1280x800 viewBox; y is rescaled to the layer's shape so dots stay round.
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 800;
const RED = '#f0060d';
const MAGENTA = '#c924d7';
const VIOLET = '#7904fd';
const TRACES = [
  [
    [-60, 70],
    [230, 70],
    [360, 125],
    [720, 125],
    [850, 82],
    [1340, 82],
  ],
  [
    [-60, 160],
    [180, 160],
    [330, 105],
    [640, 105],
    [820, 165],
    [1340, 165],
  ],
  [
    [-60, 665],
    [245, 665],
    [425, 610],
    [760, 610],
    [930, 690],
    [1340, 690],
  ],
  [
    [-60, 755],
    [315, 755],
    [500, 690],
    [850, 690],
    [1010, 755],
    [1340, 755],
  ],
  [
    [-60, 350],
    [105, 350],
    [165, 410],
    [135, 510],
    [-60, 510],
  ],
  [
    [1340, 350],
    [1185, 350],
    [1115, 420],
    [1150, 510],
    [1340, 510],
  ],
];
const DOTS = [
  { path: 0, radius: 3, color: RED, duration: 9, begin: -1 },
  { path: 0, radius: 2, color: VIOLET, duration: 12, begin: -5 },
  { path: 1, radius: 2.5, color: MAGENTA, duration: 11, begin: -3 },
  { path: 1, radius: 2, color: RED, duration: 14, begin: -8 },
  { path: 2, radius: 3, color: VIOLET, duration: 10, begin: -2 },
  { path: 2, radius: 2, color: MAGENTA, duration: 13, begin: -7 },
  { path: 3, radius: 2.5, color: RED, duration: 13, begin: -5 },
  { path: 3, radius: 2, color: VIOLET, duration: 15, begin: -9 },
  { path: 4, radius: 2, color: MAGENTA, duration: 7, begin: -1 },
  { path: 5, radius: 2, color: VIOLET, duration: 8, begin: -3 },
];
const SCAN_MS = 1900;
const RIPPLE_SPEED = 520;
const RIPPLE_LIFE_MS = 4000;
const RIPPLE_TOUCH_MS = 500;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function CircuitTraces({ paused, reducedMotion, className }) {
  const id = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const [height, setHeight] = useState(VIEW_HEIGHT);
  const scale = height / VIEW_HEIGHT;

  useEffect(() => {
    const host = svgRef.current.parentElement;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height: hostHeight } = entry.contentRect;
      if (width > 0 && hostHeight > 0) setHeight(Math.round((VIEW_WIDTH * hostHeight) / width));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (paused) svg.pauseAnimations?.();
    else svg.unpauseAnimations?.();
  }, [paused]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {TRACES.map((points, index) => (
          <path
            key={index}
            id={`${id}-trace-${index}`}
            d={points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y * scale}`).join(' ')}
          />
        ))}
      </defs>
      <g>
        {TRACES.map((_, index) => (
          <use
            key={index}
            href={`#${id}-trace-${index}`}
            stroke={MAGENTA}
            strokeWidth="1"
            fill="none"
            opacity={index % 2 === 0 ? 0.35 : 0.18}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g filter={`url(#${id}-glow)`}>
        {DOTS.map((dot, index) =>
          reducedMotion ? (
            <circle
              key={index}
              r={dot.radius}
              fill={dot.color}
              cx={35 + index * 22}
              cy={(index < 4 ? 70 + (index % 2) * 90 : 665) * scale}
            />
          ) : (
            <circle key={index} r={dot.radius} fill={dot.color}>
              <animateMotion
                dur={`${dot.duration}s`}
                begin={`${dot.begin}s`}
                repeatCount="indefinite"
              >
                <mpath href={`#${id}-trace-${dot.path}`} />
              </animateMotion>
            </circle>
          )
        )}
      </g>
    </svg>
  );
}

function LayerGrid({ layer, index }) {
  return (
    <div className="au-layer-grid">
      <div>
        <span className="au-kicker">{layer.kicker}</span>
        <h3>{layer.name}</h3>
        <p>{layer.who}</p>
        <Pill
          className={index === 0 ? 'au-layer-free' : 'au-layer-price'}
          variant={index === 0 ? 'custom' : 'light'}
        >
          {layer.tag}
        </Pill>
      </div>
      <ol>
        {layer.items.map((item, itemIndex) => (
          <li key={item}>
            <span className="au-kicker">{String(itemIndex + 1).padStart(2, '0')}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

// The "Public surface" line: two summed sines for an idle wobble, plus ripples whose front
// expands at 520px/s and decays with age and distance.
function drawSeparator(canvas, ripples, now) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!width) return;

  const t = now / 1000;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(240, 6, 13, 0)');
  gradient.addColorStop(0.15, RED);
  gradient.addColorStop(0.5, MAGENTA);
  gradient.addColorStop(0.85, VIOLET);
  gradient.addColorStop(1, 'rgba(121, 4, 253, 0)');

  ctx.beginPath();
  for (let x = 0; x <= width; x += 3) {
    let y = height / 2 + Math.sin(x * 0.011 + t * 1.2) + 0.7 * Math.sin(x * 0.023 - t * 0.8);
    for (const ripple of ripples) {
      const age = (now - ripple.t) / 1000;
      const front = age * RIPPLE_SPEED;
      const distance = Math.abs(x - ripple.x);
      if (distance < front) {
        y +=
          ripple.amp *
          Math.exp(-1.4 * age) *
          Math.exp(-0.0018 * distance) *
          Math.sin((distance - front) * 0.045);
      }
    }
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(201, 36, 215, 0.7)';
  ctx.shadowBlur = 10;
  ctx.stroke();
}

const pad = value => String(Math.max(0, Math.round(value))).padStart(4, '0');

export function AuditLayersCard({ content }) {
  const [outside, inside] = content.layers;
  const [reducedMotion] = useState(prefersReducedMotion);
  const [visible, setVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const outsideRef = useRef(null);
  const insideRef = useRef(null);
  const canvasRef = useRef(null);
  const readoutRef = useRef(null);
  const pointerRef = useRef(null);
  const expandedRef = useRef(false);
  const scanDoneRef = useRef(false);
  const ripplesRef = useRef([]);
  const lensRef = useRef({ x: null, y: null, r: 0 });

  // One observer drives everything: the first sighting starts the scan, and leaving the
  // viewport pauses the dots, the separator and the lens.
  useEffect(() => {
    const onScreen = new Set();
    const timers = [];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      });
      setVisible(onScreen.size > 0);
      if (!onScreen.has(outsideRef.current) || timers.length) return;

      const layer = outsideRef.current;
      layer.querySelectorAll('li').forEach(row => {
        row.style.transitionDelay = `${Math.round((row.offsetTop / layer.offsetHeight) * SCAN_MS)}ms`;
      });
      setScanning(true);

      // The scan line lands on the separator: one strong ripple, then two smaller ones.
      const width = layer.offsetWidth;
      [
        { delay: 0, x: 0.5, amp: 26 },
        { delay: 200, x: 0.25, amp: 12 },
        { delay: 400, x: 0.75, amp: 12 },
      ].forEach(({ delay, x, amp }) => {
        timers.push(
          setTimeout(() => {
            scanDoneRef.current = true;
            ripplesRef.current.push({ x: width * x, t: performance.now(), amp });
          }, SCAN_MS + delay)
        );
      });
    });
    observer.observe(outsideRef.current);
    observer.observe(insideRef.current);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(entry.contentRect.width * dpr);
      canvas.height = Math.round(entry.contentRect.height * dpr);
      drawSeparator(canvas, [], 0);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // One frame loop for the lens and the separator. The lens writes --x, --y and --r on the
  // Inside layer directly, so no frame goes through React.
  useEffect(() => {
    if (!visible || reducedMotion) return undefined;
    const layer = insideRef.current;
    const lens = lensRef.current;
    let lastTouch = 0;
    let frame;
    const step = now => {
      const width = layer.clientWidth;
      const height = layer.clientHeight;
      if (lens.x === null) {
        lens.x = width / 2;
        lens.y = height / 2;
      }

      const pointer = pointerRef.current;
      const target = pointer ?? {
        x: width * (0.5 + 0.36 * Math.sin(now * 0.00031)),
        y: height * (0.5 + 0.32 * Math.sin(now * 0.00047 + 1)),
      };
      const ease = pointer ? 0.16 : 0.05;
      lens.x += (target.x - lens.x) * ease;
      lens.y += (target.y - lens.y) * ease;

      let radius = 0;
      if (expandedRef.current) radius = Math.hypot(width, height) * 1.1;
      else if (scanDoneRef.current) radius = Math.min(Math.max(130, width * 0.15), 220);
      lens.r += (radius - lens.r) * 0.08;

      layer.style.setProperty('--x', `${lens.x.toFixed(1)}px`);
      layer.style.setProperty('--y', `${lens.y.toFixed(1)}px`);
      layer.style.setProperty('--r', `${lens.r.toFixed(1)}px`);
      readoutRef.current.textContent = `${content.lensLabel} ${pad(lens.x)}·${pad(lens.y)}`;
      // Flip the readout to the left of the ring when it would run off the right edge.
      readoutRef.current.classList.toggle(
        'is-left',
        lens.x + lens.r * 0.8 + readoutRef.current.offsetWidth + 24 > width
      );

      if (
        !expandedRef.current &&
        lens.r > 20 &&
        lens.y - lens.r * 0.8 <= 0 &&
        now - lastTouch > RIPPLE_TOUCH_MS
      ) {
        lastTouch = now;
        ripplesRef.current.push({ x: lens.x, t: now, amp: 6 });
      }

      ripplesRef.current = ripplesRef.current.filter(ripple => now - ripple.t < RIPPLE_LIFE_MS);
      drawSeparator(canvasRef.current, ripplesRef.current, now);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [visible, reducedMotion, content.lensLabel]);

  const toggle = () => {
    expandedRef.current = !expandedRef.current;
    setExpanded(expandedRef.current);
  };

  const onPointerMove = event => {
    const rect = insideRef.current.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onKeyDown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  };

  const cardClass = ['au-layers'];
  if (reducedMotion) cardClass.push('is-static');
  if (scanning) cardClass.push('is-scanning');

  return (
    <BaseCard
      className={cardClass.join(' ')}
      variant="white"
      padding="none"
      hover="none"
      animate={true}
      animationOrder={1}
    >
      <div ref={outsideRef} className="au-layer au-layer--outside">
        <LayerGrid layer={outside} index={0} />
      </div>

      <div className="au-layer-rule">
        <canvas ref={canvasRef} className="au-layer-wave" aria-hidden="true" />
        <Pill className="au-layer-divider" variant="dark">
          {content.divider}
        </Pill>
      </div>

      <div
        ref={insideRef}
        className={expanded ? 'au-layer au-layer--inside is-expanded' : 'au-layer au-layer--inside'}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          pointerRef.current = null;
        }}
      >
        <CircuitTraces
          className="au-layer-traces"
          paused={!visible}
          reducedMotion={reducedMotion}
        />
        <div className="au-layer-base">
          <LayerGrid layer={inside} index={1} />
        </div>
        <div className="au-layer-reveal" aria-hidden="true">
          <CircuitTraces
            className="au-layer-traces"
            paused={!visible}
            reducedMotion={reducedMotion}
          />
          <LayerGrid layer={inside} index={1} />
        </div>
        <span className="au-lens" aria-hidden="true" />
        <span ref={readoutRef} className="au-lens-readout" aria-hidden="true" />
        <span className="au-lens-hint" aria-hidden="true">
          {content.lensHint}
        </span>
      </div>
    </BaseCard>
  );
}
