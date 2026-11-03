import { FluidCanvas } from './FluidCanvas';

// A hanging drop that slowly gathers weight, stretches a neck downwards and lets a droplet
// go, then bounces back and wobbles to rest like real liquid before gathering again. Every
// value is continuous across the loop: the droplet falls out of view before it restarts,
// the new one grows from inside the hanging drop with a radius that starts below zero, and
// the wobble has died away by the time the next gather begins.
const MELT = 0.38;
const CYCLE_SECONDS = 6.5;
// Share of the cycle spent gathering before the droplet lets go
const RELEASE = 0.6;
// How far the tip stretches in the last moments before it lets go, and the pull of gravity
// on the falling droplet; the droplet leaves at the speed the stretch gave it
const LAST_STRETCH = 0.15;
const GRAVITY = 20;
// The recoil after release: how fast the wobble dies away and how fast it swings
const WOBBLE_DAMPING = 1.6;
const WOBBLE_SPEED = 3.2;

const ease = x => x * x * (3 - 2 * x);

function balls(t) {
  const phase = (t % CYCLE_SECONDS) / CYCLE_SECONDS;
  const sway = 0.06 * Math.sin(t * 0.5);
  let neck;
  let bounce = 0;
  let tipY;
  let tipRadius;

  if (phase < RELEASE) {
    const x = phase / RELEASE;
    neck = ease(x);
    // The weight builds slowly, then the tip stretches faster just before it breaks
    tipY = 0.4 - 0.6 * ease(x) - LAST_STRETCH * x ** 4;
    tipRadius = -0.2 + 0.36 * ease(x);
  } else {
    const sinceRelease = phase - RELEASE;
    const seconds = sinceRelease * CYCLE_SECONDS;
    // The neck eases back from rest, swings past it and settles, and the body bounces with
    // it. The swing fades to exactly nothing by the end of the cycle, so the next gather
    // starts from a still drop
    const fade = Math.exp(-WOBBLE_DAMPING * seconds) * (1 - (sinceRelease / (1 - RELEASE)) ** 3);
    const swing = WOBBLE_SPEED * seconds;
    neck = fade * (Math.cos(swing) + (WOBBLE_DAMPING / WOBBLE_SPEED) * Math.sin(swing));
    bounce = 0.05 * fade * Math.sin(swing);
    const releaseSpeed = (4 * LAST_STRETCH) / RELEASE;
    tipY = 0.4 - 0.6 - LAST_STRETCH - releaseSpeed * sinceRelease - GRAVITY * sinceRelease ** 2;
    tipRadius = 0.16 - 0.03 * (sinceRelease / (1 - RELEASE));
  }

  return [
    [sway, 0.75 + bounce, 0, 0.5 - 0.3 * bounce],
    [sway * 0.6 - 0.22, 0.85 + bounce * 0.6, -0.1, 0.34],
    [sway * 0.4 + 0.06, 0.4 - 0.3 * neck + bounce, 0.05, 0.2 + 0.06 * neck],
    [sway * 0.2, tipY, 0.05, tipRadius],
  ];
}

export function DrippingDropArt({ className }) {
  return <FluidCanvas balls={balls} melt={MELT} className={className} />;
}
