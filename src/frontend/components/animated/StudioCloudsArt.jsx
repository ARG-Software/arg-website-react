import { useMemo } from 'react';
import { FluidCanvas } from './FluidCanvas';

// An irregular mass low on the left, and a smaller companion on the right. They rise and
// shrink as the section scrolls, and a small ball follows the pointer
const MELT = 0.17;
const EDGE = 0.12;
const SIZE_BOOST = 1;
const RIGHT_SCALE = 0.62;
const LEFT_PARALLAX = 0.8;
const RIGHT_PARALLAX = 2.2;

function pinY(y, radius, view) {
  const maxY = Math.max(0, view.halfHeight - radius - EDGE);
  return Math.min(maxY, Math.max(-maxY, y));
}

function keepOnCanvas(x, y, z, radius, view) {
  const maxX = Math.max(0, view.halfWidth - radius - EDGE);
  return [Math.min(maxX, Math.max(-maxX, x)), pinY(y, radius, view), z, radius];
}

function balls(seconds, view, transition = 0) {
  const size = Math.min(1, view.halfWidth / 2.2) * SIZE_BOOST;
  const shrink = 1 - 0.7 * Math.abs(transition);
  const leftY = transition * LEFT_PARALLAX;
  const rightY = transition * RIGHT_PARALLAX;
  const t = seconds;
  const wall = -view.halfWidth + 0.15;
  const peel = (0.5 + 0.5 * Math.sin(t * 0.42)) * 0.22 * size;
  const slide = 0.04 * size;
  const left = [
    [
      wall + 0.4 * size + peel,
      0.28 * size + 0.04 * size * Math.cos(t * 0.38),
      0.05 * Math.sin(t * 0.32),
      0.48 * size,
    ],
    [
      wall + 1.08 * size + 0.75 * peel,
      0.22 * size + 0.03 * size * Math.sin(t * 0.44),
      0.04 * Math.cos(t * 0.36),
      0.34 * size,
    ],
    [
      wall + 0.32 * size + 0.3 * peel,
      -0.88 * size + 0.03 * size * Math.cos(t * 0.4 + 1.1),
      0.04 * Math.sin(t * 0.34 + 0.5),
      0.38 * size,
    ],
    [
      wall + 0.95 * size + 0.5 * peel,
      -0.28 * size + 0.03 * size * Math.sin(t * 0.35 + 0.8),
      0.04 * Math.cos(t * 0.3),
      0.22 * size,
    ],
  ];
  const right = [
    keepOnCanvas(
      (2.1 + 0.12 * Math.sin(t * 0.4 + 0.7)) * size,
      (-0.675 + 0.1 * Math.cos(t * 0.35 + 1.3)) * size,
      0.14 * Math.sin(t * 0.3 + 0.8),
      0.7 * size * RIGHT_SCALE,
      view
    ),
    keepOnCanvas(
      (0.975 + 0.1 * Math.cos(t * 0.48 + 2.4)) * size,
      (-0.85 + 0.08 * Math.sin(t * 0.42 + 0.2)) * size,
      0.12 * Math.cos(t * 0.34 + 1.1),
      0.4 * size * RIGHT_SCALE,
      view
    ),
  ];
  return [...left, ...right].map(([x, y, z, radius], index) => [
    x,
    y + (index < 4 ? leftY : rightY) + (index < 4 ? slide * Math.sin(t * 0.3 + index) : 0),
    z,
    radius * shrink,
  ]);
}

function paintMatcap() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const body = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  body.addColorStop(0, 'rgb(148, 156, 182)');
  body.addColorStop(0.55, 'rgb(176, 184, 208)');
  body.addColorStop(1, 'rgb(210, 216, 232)');
  context.fillStyle = body;
  context.fillRect(0, 0, size, size);
  const side = context.createLinearGradient(0, 0, size * 0.5, 0);
  side.addColorStop(0, 'rgba(110, 118, 148, 0.4)');
  side.addColorStop(1, 'rgba(110, 118, 148, 0)');
  context.fillStyle = side;
  context.fillRect(0, 0, size, size);
  const glow = context.createRadialGradient(
    size * 0.36,
    size * 0.3,
    0,
    size * 0.36,
    size * 0.3,
    size * 0.35
  );
  glow.addColorStop(0, 'rgba(230, 234, 248, 0.55)');
  glow.addColorStop(1, 'rgba(230, 234, 248, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);
  return canvas;
}

export function StudioCloudsArt({ className }) {
  const matcap = useMemo(() => paintMatcap(), []);
  return (
    <FluidCanvas
      balls={balls}
      melt={MELT}
      matcap={matcap}
      cursor
      scrollParallax
      maxPixelRatio={1}
      className={className}
    />
  );
}
