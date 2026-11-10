import { FluidCanvas } from './FluidCanvas';

// The drop from the end of the intro: a wide, breathing body with a small bump that travels
// around its rim.
const MELT = 0.45;
const PACE = 0.55;

function balls(seconds) {
  const t = seconds * PACE;
  const breath = 1 + 0.05 * Math.sin(t * 0.9) + 0.03 * Math.sin(seconds * 0.25);
  const rim = t * 0.5 + 0.2 * Math.sin(seconds * 0.28);
  return [
    [-0.35 + 0.04 * Math.sin(seconds * 0.2), 0, 0, 0.55 * breath],
    [0.35, 0.02 + 0.03 * Math.cos(seconds * 0.18), 0, 0.55 * breath],
    [0, -0.05 + 0.04 * Math.sin(t * 0.7), 0.1, 0.6 * breath],
    [0.75 * Math.cos(rim), 0.42 * Math.sin(rim), 0.1, 0.16 + 0.04 * Math.sin(t * 1.1)],
  ];
}

export function GlowCoreArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} cursor className={className} />;
}
