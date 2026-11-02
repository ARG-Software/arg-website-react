import { FluidCanvas } from './FluidCanvas';

// The drop from the end of the intro: a wide, breathing body with a small bump that travels
// around its rim.
const MELT = 0.45;

function balls(t) {
  const breath = 1 + 0.05 * Math.sin(t * 0.9);
  const rim = t * 0.5;
  return [
    [-0.35, 0, 0, 0.55 * breath],
    [0.35, 0.02, 0, 0.55 * breath],
    [0, -0.05 + 0.04 * Math.sin(t * 0.7), 0.1, 0.6 * breath],
    [0.75 * Math.cos(rim), 0.42 * Math.sin(rim), 0.1, 0.18],
  ];
}

export function GlowCoreArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
