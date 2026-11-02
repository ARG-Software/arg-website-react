import { FluidCanvas } from './FluidCanvas';

// The pearl from the start of the intro: a soft body that keeps reshaping, with two
// droplets circling it and dipping back in.
const MELT = 0.35;

function balls(t) {
  const orbit = 0.95 + 0.12 * Math.sin(t * 0.7);
  return [
    [0.12 * Math.sin(t * 0.6), 0.1 * Math.cos(t * 0.5), 0, 0.58],
    [0.32 * Math.cos(t * 0.45), 0.25 * Math.sin(t * 0.7), 0.15, 0.42],
    [-0.3 * Math.sin(t * 0.5 + 1), -0.28 * Math.cos(t * 0.4), -0.1, 0.4],
    [orbit * Math.cos(t * 0.8), 0.55 * Math.sin(t * 0.8), 0.5 * Math.sin(t * 0.8 + 1), 0.13],
    [-orbit * Math.sin(t * 0.55), 0.8 * Math.cos(t * 0.55), 0.4 * Math.cos(t * 0.55), 0.09],
  ];
}

export function PearlBlobArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
