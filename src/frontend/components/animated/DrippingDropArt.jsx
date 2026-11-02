import { FluidCanvas } from './FluidCanvas';

// A hanging drop that slowly gathers weight, stretches a neck downwards and lets a droplet
// go, then gathers again.
const MELT = 0.38;
const CYCLE_SECONDS = 5;

function balls(t) {
  const phase = (t % CYCLE_SECONDS) / CYCLE_SECONDS;
  // Gathers for the first 60% of the cycle, then the droplet falls away
  const gather = Math.min(phase / 0.6, 1);
  const fall = Math.max(0, (phase - 0.6) / 0.4);
  const sway = 0.06 * Math.sin(t * 0.5);
  return [
    [sway, 0.75, 0, 0.5],
    [sway * 0.6 - 0.22, 0.85, -0.1, 0.34],
    [sway * 0.4 + 0.06, 0.4 - 0.3 * gather, 0.05, 0.2 + 0.06 * gather],
    [sway * 0.2, 0.05 - 0.25 * gather - 1.1 * fall * fall, 0.05, 0.16 * (1 - fall * 0.4)],
  ];
}

export function DrippingDropArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
