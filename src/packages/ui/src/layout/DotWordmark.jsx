import { useEffect, useRef } from 'react';

// A word set to the full width of its box, cropped by the bottom edge and printed as dots.
// Each dot is sized by how much of the letter covers its cell, so the type keeps its edges.
// The pointer pushes dots away on springs and they warm in colour while displaced; a click
// sends a shock ring through the word. The block sets its own height from the word.
export function DotWordmark({
  word,
  ink = '#ffffff',
  warm = '#c924d7',
  fontFamily = 'Neuemontreal, sans-serif',
  fontWeight = 500,
  crop = 0.18,
  radius = 80,
  className = '',
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inkRgb = hexToRgb(ink);
    const warmRgb = hexToRgb(warm);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = -1e5;
    let pointerY = -1e5;
    let ring = { x: 0, y: 0, t: -1 };
    let raf = 0;
    let awake = true;
    // Flat array: x, y, vx, vy, homeX, homeY, radius per dot
    let dots = new Float32Array(0);
    let count = 0;

    const layout = () => {
      const nextWidth = Math.max(1, Math.round(root.clientWidth));
      if (nextWidth === width && count > 0) return;
      width = nextWidth;

      const mask = document.createElement('canvas');
      const m = mask.getContext('2d', { willReadFrequently: true });
      m.font = `${fontWeight} 100px ${fontFamily}`;
      // Fit the letters' ink, not the advance width, so the word lines up with the layout edges
      const probe = m.measureText(word);
      const size = (width / (probe.actualBoundingBoxLeft + probe.actualBoundingBoxRight)) * 100;
      m.font = `${fontWeight} ${size}px ${fontFamily}`;
      const box = m.measureText(word);
      const cap = box.actualBoundingBoxAscent || size * 0.72;
      height = Math.max(1, Math.round(cap * (1 - crop) + size * 0.06));
      root.style.height = `${height}px`;

      mask.width = width;
      mask.height = height;
      m.font = `${fontWeight} ${size}px ${fontFamily}`;
      m.textBaseline = 'alphabetic';
      m.fillText(word, box.actualBoundingBoxLeft, height + cap * crop);
      const alpha = m.getImageData(0, 0, width, height).data;

      // Finer dots on narrow screens so thin strokes keep a few dots across
      const gap = Math.min(6, Math.max(3, width / 240));
      const cols = Math.ceil(width / gap);
      const rows = Math.ceil(height / gap);
      const next = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          // Coverage is the average alpha over a 3×3 sample of the cell
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(width - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(height - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += alpha[(y * width + x) * 4 + 3];
            }
          }
          const coverage = sum / (9 * 255);
          if (coverage < 0.06) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          // Area-true radius keeps the tone even
          next.push(hx, hy, 0, 0, hx, hy, Math.sqrt(coverage) * gap * 0.56);
        }
      }
      dots = new Float32Array(next);
      count = next.length / 7;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      awake = true;
    };

    const draw = now => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const push = reduced ? 0 : radius;
      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringRadius = ringAge * 0.9;
      let moving = false;

      for (let i = 0; i < count; i++) {
        const j = i * 7;
        let x = dots[j];
        let y = dots[j + 1];
        let vx = dots[j + 2];
        let vy = dots[j + 3];
        const hx = dots[j + 4];
        const hy = dots[j + 5];

        if (!reduced) {
          if (ringAge < 900) {
            const dx = hx - ring.x;
            const dy = hy - ring.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const band = 1 - Math.min(1, Math.abs(d - ringRadius) / 26);
            if (band > 0) {
              const force = band * 3.2 * (1 - ringAge / 900);
              vx += (dx / d) * force;
              vy += (dy / d) * force;
            }
          }

          const dx = x - pointerX;
          const dy = y - pointerY;
          const d2 = dx * dx + dy * dy;
          if (push > 0 && d2 < push * push) {
            const d = Math.sqrt(d2) + 0.001;
            const force = (1 - d / push) * 2.6;
            vx += (dx / d) * force;
            vy += (dy / d) * force;
          }
          // Spring home, damped
          vx = (vx + (hx - x) * 0.05) * 0.84;
          vy = (vy + (hy - y) * 0.05) * 0.84;
          x += vx;
          y += vy;

          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) {
            moving = true;
          } else {
            x = hx;
            y = hy;
            vx = 0;
            vy = 0;
          }
          dots[j] = x;
          dots[j + 1] = y;
          dots[j + 2] = vx;
          dots[j + 3] = vy;
        }

        const warmth = Math.min(1, Math.hypot(x - hx, y - hy) / 28);
        if (warmth > 0.02) {
          const r = Math.round(inkRgb[0] + (warmRgb[0] - inkRgb[0]) * warmth);
          const g = Math.round(inkRgb[1] + (warmRgb[1] - inkRgb[1]) * warmth);
          const b = Math.round(inkRgb[2] + (warmRgb[2] - inkRgb[2]) * warmth);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          ctx.fillStyle = ink;
        }
        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6], 0, Math.PI * 2);
        ctx.fill();
      }

      // Sleep once every dot is home and nothing is pushing
      awake = moving || ringAge < 900 || pointerX > -1e4;
    };

    const loop = now => {
      raf = 0;
      draw(now);
      if (awake) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      awake = true;
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = event => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      pointerY = event.clientY - bounds.top;
      wake();
    };
    const onLeave = () => {
      pointerX = -1e5;
      pointerY = -1e5;
      wake();
    };
    const onDown = event => {
      if (reduced) return;
      const bounds = canvas.getBoundingClientRect();
      ring = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        t: performance.now(),
      };
      wake();
    };

    layout();
    wake();

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    const resizeObserver = new ResizeObserver(() => {
      layout();
      wake();
    });
    resizeObserver.observe(root);

    // A web font that lands late re-sets the word in its real face
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      count = 0;
      layout();
      wake();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointerdown', onDown);
    };
  }, [word, ink, warm, fontFamily, fontWeight, crop, radius]);

  return (
    <div ref={rootRef} className={`dot-wordmark ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map(c => c + c)
          .join('')
      : value;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}
