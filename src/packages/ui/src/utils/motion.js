// Whether the visitor asked their system for less motion. The package cannot import the
// frontend's prefersReducedMotion (src/frontend/utils/helpers.js), so it keeps this copy.
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
