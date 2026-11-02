import { FluidCanvas } from './FluidCanvas';

// Two drops drifting apart and melting back into one.
const MELT = 0.4;

function balls(t) {
  const apart = 0.15 + 0.5 * (0.5 - 0.5 * Math.cos(t * 0.6));
  const tilt = 0.3 * Math.sin(t * 0.25);
  return [
    [-apart, tilt, 0, 0.5],
    [apart, -tilt, 0, 0.46],
    [0, 0.05 * Math.sin(t), 0.2, 0.22],
    [-apart - 0.45, tilt + 0.35, -0.1, 0.12],
  ];
}

export function MergingDropsArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
