import { FluidCanvas } from './FluidCanvas';

// A ribbon of liquid with a slow wave running along it, thicker in the middle and tapering
// to its ends, the whole ribbon gently turning in depth.
const MELT = 0.3;
const BEADS = [
  { x: -1.0, radius: 0.16 },
  { x: -0.6, radius: 0.26 },
  { x: -0.2, radius: 0.34 },
  { x: 0.2, radius: 0.34 },
  { x: 0.6, radius: 0.26 },
  { x: 1.0, radius: 0.16 },
];

function balls(t) {
  const turn = 0.35 * Math.sin(t * 0.3);
  return BEADS.map(({ x, radius }, index) => {
    const wave = t * 1.1 - index * 0.8;
    return [
      x * Math.cos(turn),
      0.3 * Math.sin(wave) - 0.12 * x * Math.sin(turn),
      x * Math.sin(turn),
      radius * (1 + 0.12 * Math.cos(wave)),
    ];
  });
}

export function LiquidRibbonArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
