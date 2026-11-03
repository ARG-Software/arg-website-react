import { FluidCanvas } from './FluidCanvas';

// A liquid core with a ring of beads orbiting it on a tilted path. The ring slowly breathes in
// and out, so the beads melt into the core and pull free of it again as they turn.
const MELT = 0.26;
const BEADS = 5;
const TILT = 0.4;

function balls(t) {
  const ring = 0.5 + 0.42 * (0.5 - 0.5 * Math.cos(t * 0.45));
  const beads = Array.from({ length: BEADS }, (_, index) => {
    const angle = t * 0.5 + (index * 2 * Math.PI) / BEADS;
    return [
      ring * Math.cos(angle),
      ring * Math.sin(angle) * Math.sin(TILT),
      ring * Math.sin(angle) * Math.cos(TILT),
      0.12,
    ];
  });
  return [[0, 0, 0, 0.4 + 0.03 * Math.sin(t * 0.9)], ...beads];
}

export function OrbitingBeadsArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
