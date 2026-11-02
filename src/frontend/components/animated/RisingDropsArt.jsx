import { FluidCanvas } from './FluidCanvas';

// A pool with drops that pull away from it, rise, and fall back in.
const MELT = 0.45;
const DROPS = [
  { x: -0.25, phase: 0, radius: 0.28 },
  { x: 0.3, phase: 2.1, radius: 0.24 },
  { x: 0.02, phase: 4.2, radius: 0.2 },
];

function balls(t) {
  return [
    [-0.3, -0.62, 0, 0.5],
    [0.32, -0.66, 0.05, 0.48],
    ...DROPS.map(drop => {
      const rise = 0.5 - 0.5 * Math.cos(t * 0.5 + drop.phase);
      return [drop.x + 0.1 * Math.sin(t * 0.7 + drop.phase), -0.5 + rise * 1.3, 0, drop.radius];
    }),
  ];
}

export function RisingDropsArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
