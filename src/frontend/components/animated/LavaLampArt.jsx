import { FluidCanvas } from './FluidCanvas';

// A lava lamp passage: drops drift up through the canvas in an endless flow. They rise at
// one pace, evenly spaced so the passage never empties, and each bobs on its own, so
// neighbours melt into each other now and then and part again. Each enters below the bottom
// edge and leaves above the top, so it wraps round out of sight
const MELT = 0.45;
// Our dark blue, #0c002e
const COLOUR = [0.047, 0, 0.18];
const BOTTOM = -2.6;
const TOP = 2.6;
// Passes through the canvas per second
const SPEED = 0.035;
const DROPS = [
  { x: -0.2, radius: 0.34, phase: 0 },
  { x: 0.25, radius: 0.24, phase: 0.2 },
  { x: 0, radius: 0.3, phase: 0.4 },
  { x: -0.3, radius: 0.22, phase: 0.6 },
  { x: 0.2, radius: 0.28, phase: 0.8 },
];

function balls(t) {
  return DROPS.map(drop => [
    drop.x + 0.22 * Math.sin(t * 0.28 + drop.phase * 6) + 0.08 * Math.sin(t * 0.15 + drop.phase),
    BOTTOM +
      (TOP - BOTTOM) * ((t * SPEED + drop.phase) % 1) +
      0.3 * Math.sin(t * 0.35 + drop.phase * 9),
    0.1 * Math.sin(t * 0.25 + drop.phase * 4),
    drop.radius * (1 + 0.08 * Math.sin(t * 0.4 + drop.phase * 5)),
  ]);
}

export function LavaLampArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} colour={COLOUR} cursor className={className} />;
}
