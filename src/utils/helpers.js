import { MOBILE_BREAKPOINT } from '../constants/ui.js';

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

/**
 * Truncate a string to a specified maximum length.
 * @param {string} text - The input string to truncate.
 * @param {number} maxLength - The maximum length of the truncated string.
 * @returns {string} - The truncated string.
 */
export function truncateText(text = '', maxLength = 200) {
  if (text.length <= maxLength) return text;
  return `${text
    .slice(0, maxLength)
    .trim()
    .replace(/[.,;:!?-]+$/, '')}...`;
}

/**
 * Normalize a pathname by removing trailing slashes.
 * @param {string} pathname - The pathname to normalize.
 * @returns {string} - The normalized pathname.
 */
export function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Check if the current viewport is at or below the mobile breakpoint.
 * @returns {boolean}
 */
export function isMobile() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}
