import { FluidCanvas } from './FluidCanvas';

// A liquid core with a ring of beads orbiting it on a tilted path. The ring slowly breathes in
// and out, so the beads melt into the core and pull free of it again as they turn.
const MELT = 0.26;
const BEADS = 5;
const TILT = 0.4;
const PACE = 0.55;

function balls(seconds) {
  const t = seconds * PACE;
  const ring = 0.5 + 0.42 * (0.5 - 0.5 * Math.cos(t * 0.45));
  const beads = Array.from({ length: BEADS }, (_, index) => {
    const angle = t * 0.5 + (index * 2 * Math.PI) / BEADS + 0.12 * Math.sin(t * 0.7 + index);
    const wobble = 0.06 * Math.sin(t * 0.9 + index * 1.7);
    return [
      ring * Math.cos(angle) + wobble,
      ring * Math.sin(angle) * Math.sin(TILT),
      ring * Math.sin(angle) * Math.cos(TILT),
      0.09 + 0.05 * ((index % 3) / 2) + 0.015 * Math.sin(t + index),
    ];
  });
  return [
    [
      0.04 * Math.sin(seconds * 0.2),
      0.03 * Math.cos(seconds * 0.17),
      0,
      0.4 + 0.04 * Math.sin(t * 0.9),
    ],
    ...beads,
  ];
}

export function OrbitingBeadsArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} cursor className={className} />;
}
