/**
 * Convert a string to a URL-friendly slug.
 * Example: "Hello World!" → "hello-world"
 */
export function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Cubic ease-out function (1 - (1 - t)^3).
 * Commonly used for smooth animations.
 */
export function cubicEaseOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
