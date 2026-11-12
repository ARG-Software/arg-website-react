import { useContext, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animateCountUp, getCountUpEnd } from './useCountUp';
import {
  ANIMATION_PRESETS,
  ATTRIBUTE_PRESETS,
  REVEAL_INTRO_STEP_MS,
  REVEAL_MAX_STEPS,
  REVEAL_STEP_MS,
} from '../animations/attribute-presets';
import { DEFAULT_ROOT_MARGIN } from '../constants/ui.js';
import { isMobile, prefersReducedMotion } from '../utils/helpers';
import { LoadingContext } from '../providers/LoadingProvider';

gsap.registerPlugin(ScrollTrigger);

// How reveals are timed
//
// Elements of one scope that come into view together reveal as one cascade, REVEAL_STEP_MS
// apart, in reading order: data-animate-order-mobile on phones when set, otherwise
// data-animate-order, then their position on screen, top to bottom and left to right. The
// cascade starts the moment they are seen, so an element that scrolls into view on its own
// appears at once, whatever its order number. Every page shares this one rhythm.

// Rows closer than this are treated as one line when sorting by position
const SAME_ROW_PX = 16;

// Get maximum transition duration from transition string (e.g., "opacity 0.8s ease, transform 0.8s ease")
const getMaxTransitionDuration = transitionString => {
  if (!transitionString) return 0;
  const matches = transitionString.match(/(\d+(\.\d+)?)s/g);
  if (!matches) return 0;
  const durations = matches.map(match => parseFloat(match));
  return Math.max(...durations) * 1000; // Convert to milliseconds
};

// Find nearest animation scope ancestor (element with data-animate-scope)
const findAnimationScope = element => {
  let current = element.parentElement;
  while (current) {
    if (current.hasAttribute('data-animate-scope')) {
      return current;
    }
    current = current.parentElement;
  }
  return null; // No scope found
};

// Get any animation attribute from element or nearest ancestor
const getInheritedAttribute = (element, attrName) => {
  // Check element itself first (nearest wins)
  const elementValue = element.getAttribute(attrName);
  if (elementValue !== null) {
    return elementValue;
  }

  // Search up ancestors
  let current = element.parentElement;
  while (current) {
    const ancestorValue = current.getAttribute(attrName);
    if (ancestorValue !== null) {
      return ancestorValue;
    }
    current = current.parentElement;
  }

  // Not found in element or any ancestor
  return null;
};

// Get inherited preset name from element or nearest ancestor with animation attributes
const getInheritedPreset = element => {
  const elementPreset = element.getAttribute('data-animate');

  // If element has data-animate attribute with non-empty value, use it
  if (elementPreset !== null && elementPreset !== '') {
    return elementPreset;
  }

  // Empty data-animate="" means no animation (don't inherit)
  if (elementPreset === '') {
    return null;
  }

  // If element has no data-animate attribute at all, inherit from nearest ancestor
  // First check for data-animate-default-preset on any ancestor
  const defaultPreset = getInheritedAttribute(element, 'data-animate-default-preset');
  if (defaultPreset) {
    return defaultPreset;
  }

  // Then check for regular data-animate on ancestors (for inheritance chains)
  const ancestorPreset = getInheritedAttribute(element, 'data-animate');
  if (ancestorPreset && ancestorPreset !== '') {
    return ancestorPreset;
  }

  // No preset found - element should be skipped
  return null;
};

const getTrigger = element =>
  getInheritedAttribute(element, 'data-animate-trigger') ||
  getInheritedAttribute(element, 'data-animate-default-trigger') ||
  'scroll';

const getOrder = element => {
  const mobileOrder = isMobile() ? element.getAttribute('data-animate-order-mobile') : null;
  return Number(mobileOrder ?? element.getAttribute('data-animate-order')) || 0;
};

// Apply initial styles based on preset and element attributes
const applyInitialState = (element, preset, presetName) => {
  const distance = getInheritedAttribute(element, 'data-animate-distance');
  if (distance && preset.initialTransform?.includes('var(--distance')) {
    element.style.setProperty('--distance', distance);
  }

  if (preset.initialOpacity) {
    element.style.setProperty('opacity', preset.initialOpacity, 'important');
  }

  if (preset.initialTransform) {
    element.style.setProperty('transform', preset.initialTransform, 'important');
  }

  // Special handling for team overlay (height collapse animation)
  if (presetName === ANIMATION_PRESETS.overlayReveal) {
    const overlay = element.querySelector('.team_image-overlay');
    if (overlay) {
      overlay.style.setProperty('height', '100%', 'important');
      overlay.style.setProperty('overflow', 'hidden', 'important');
    }
    element.style.setProperty('opacity', '0', 'important');
  }

  if (presetName === ANIMATION_PRESETS.widthCountup) {
    const line = element.querySelector('.work-item_line, .prp-metric-line');
    if (line) {
      line.style.setProperty('width', '0%', 'important');
    }
  }
};

// Get final transform state based on preset
const getFinalTransform = presetName => {
  if (presetName === ANIMATION_PRESETS.slideUpRotate) {
    return 'translate3d(0, 0, 0) rotateZ(0deg)';
  }
  if (
    presetName === ANIMATION_PRESETS.dividerExpanderShow ||
    presetName === ANIMATION_PRESETS.lineGrowDown
  ) {
    return 'scale3d(1, 1, 1)';
  }
  return 'translate3d(0, 0, 0)';
};

// Animate element after the given delay
const animateElement = (element, preset, presetName, delay) => {
  // data-animate-duration (e.g. "1.6s") replaces the preset's durations for that element only; it is
  // kept for the home hero title, every other element uses the shared preset timing
  const duration = element.getAttribute('data-animate-duration');
  const transition = duration
    ? preset.transition?.replace(/\d+(\.\d+)?s/g, duration)
    : preset.transition;

  setTimeout(() => {
    // Remove !important flags
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('height');
    element.style.removeProperty('overflow');

    // Apply transition (override CSS !important)
    if (transition) {
      element.style.setProperty('transition', transition, 'important');
    }

    // Animate to final state (override CSS !important during animation)
    if (preset.initialOpacity || preset.initialTransform) {
      element.style.setProperty('opacity', '1', 'important');
      element.style.setProperty('transform', getFinalTransform(presetName), 'important');

      // Remove !important after transition so CSS hover states can work
      const onTransitionEnd = () => {
        element.style.opacity = '1';
        element.style.removeProperty('transform');
        element.style.transition = transition || '';
        element.removeEventListener('transitionend', onTransitionEnd);
      };

      element.addEventListener('transitionend', onTransitionEnd);
      // Fallback: also remove !important after max transition duration
      const maxDuration = getMaxTransitionDuration(transition);
      if (maxDuration > 0) {
        setTimeout(() => {
          element.style.opacity = '1';
          element.style.removeProperty('transform');
          element.style.transition = transition || '';
        }, maxDuration);
      }
    }

    // Special handling for team overlay
    if (presetName === ANIMATION_PRESETS.overlayReveal) {
      const overlay = element.querySelector('.team_image-overlay');
      if (overlay) {
        overlay.style.transition = transition;
        overlay.style.setProperty('height', '0%', 'important');
      }
    }

    element.classList.add('is-visible');

    // Handle number count-up
    if (presetName === ANIMATION_PRESETS.widthCountup) {
      const line = element.querySelector('.work-item_line, .prp-metric-line');
      if (line) {
        line.style.transition = preset.transition;
        line.offsetHeight;
        line.style.setProperty('width', '100%', 'important');
      }

      const numEl = element.querySelector('[fs-numbercount-element="number"]');
      if (numEl) {
        const end = getCountUpEnd(numEl);
        if (end !== null) {
          setTimeout(() => animateCountUp(numEl, end, preset.countUpDuration), 300);
        }
      }
    }
  }, delay);
};

// Reveal elements of one scope that came into view together. A cascade still running in the
// scope carries over for at most two steps, so fast scrolling never builds up a queue. Page
// intros take the slower intro step and are never capped
const revealBatch = (items, scope, intro) => {
  const step = intro ? REVEAL_INTRO_STEP_MS : REVEAL_STEP_MS;
  const maxSteps = intro ? items.length : REVEAL_MAX_STEPS;
  const rects = new Map(items.map(item => [item, item.element.getBoundingClientRect()]));
  items.sort((a, b) => {
    const orderDiff = getOrder(a.element) - getOrder(b.element);
    if (orderDiff) return orderDiff;
    const rectA = rects.get(a);
    const rectB = rects.get(b);
    if (Math.abs(rectA.top - rectB.top) > SAME_ROW_PX) return rectA.top - rectB.top;
    return rectA.left - rectB.left;
  });

  const now = performance.now();
  const start = Math.min(Math.max(0, scope.nextReveal - now), 2 * step);
  items.forEach((item, index) => {
    const delay = start + Math.min(index, maxSteps) * step;
    animateElement(item.element, item.preset, item.presetName, delay);
  });
  scope.nextReveal = now + start + (Math.min(items.length - 1, maxSteps) + 1) * step;
};

// Group items by their scope and reveal each group as one batch
const revealByScope = (items, scopes, intro = false) => {
  const groups = new Map();
  items.forEach(item => {
    if (!groups.has(item.scope)) groups.set(item.scope, []);
    groups.get(item.scope).push(item);
  });
  groups.forEach((group, scopeElement) => {
    if (!scopes.has(scopeElement)) scopes.set(scopeElement, { nextReveal: 0 });
    revealBatch(group, scopes.get(scopeElement), intro);
  });
};

// Main hook - attribute-based animation system
export function useScrollAnimations(config = {}) {
  const {
    enabled = true,
    mobileBehavior = 'adaptive', // 'adaptive', 'same', 'disabled'
  } = config;

  const observerRef = useRef(null);
  const mountedRef = useRef(true);

  const done = useContext(LoadingContext);

  useEffect(() => {
    if (!enabled) return;

    // Check mobile behavior
    const mobile = isMobile();
    if (mobileBehavior === 'disabled' && mobile) return;

    // Visitors who asked for less motion get every element in its final state: nothing is hidden
    // and nothing reveals. Stat lines and count-ups start empty in the markup, so fill them here
    if (prefersReducedMotion()) {
      document
        .querySelectorAll(`[data-animate="${ANIMATION_PRESETS.widthCountup}"]`)
        .forEach(element => {
          const line = element.querySelector('.work-item_line, .prp-metric-line');
          if (line) line.style.width = '100%';
          const numEl = element.querySelector('[fs-numbercount-element="number"]');
          const end = numEl ? getCountUpEnd(numEl) : null;
          if (end !== null)
            numEl.textContent = end % 1 !== 0 ? end.toFixed(1) : end.toLocaleString();
        });
      return;
    }

    mountedRef.current = true;

    // Declared at effect level so cleanup can kill them
    let gsapTriggers = [];

    // Initialize after DOM is ready
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;

      const scrollItems = new Map();
      const loadItems = [];
      const scopes = new Map();

      document.querySelectorAll('[data-animate], [data-animate-order]').forEach(element => {
        const presetName = getInheritedPreset(element);
        const preset = ATTRIBUTE_PRESETS[presetName];
        // gsap-scale follows the scroll position instead of revealing (set up below)
        if (!preset || presetName === ANIMATION_PRESETS.gsapScale) return;

        // Elements outside any scope are grouped by the section they sit in
        const scope =
          findAnimationScope(element) ??
          element.closest('section, header, footer, article') ??
          document.body;
        const item = { element, preset, presetName, scope };

        if (getTrigger(element) === 'load') loadItems.push(item);
        else scrollItems.set(element, item);
      });

      // While the loading screen is up everything stays hidden; this effect runs again once it
      // is done, so nothing reveals behind it
      const visibleLoadItems = loadItems.filter(item => !item.element.closest('.ls-overlay'));
      [...visibleLoadItems, ...scrollItems.values()].forEach(({ element, preset, presetName }) =>
        applyInitialState(element, preset, presetName)
      );
      if (!done) return;
      revealByScope(visibleLoadItems, scopes, true);

      // Elements already scrolled past (a restored scroll position) reveal straight away
      const observer = new IntersectionObserver(
        entries => {
          const entered = [];
          entries.forEach(entry => {
            if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) return;
            const item = scrollItems.get(entry.target);
            if (!item) return;
            scrollItems.delete(entry.target);
            observer.unobserve(entry.target);
            entered.push(item);
          });
          if (entered.length) revealByScope(entered, scopes);
        },
        { threshold: 0, rootMargin: DEFAULT_ROOT_MARGIN }
      );

      scrollItems.forEach(({ element, presetName }) => {
        // Force reflow for CSS !important overrides
        if (presetName === ANIMATION_PRESETS.overlayReveal) {
          element.offsetHeight;
        }

        if (presetName === ANIMATION_PRESETS.widthCountup) {
          const line = element.querySelector('.work-item_line, .prp-metric-line');
          if (line) line.offsetHeight;
        }

        observer.observe(element);
      });

      // Store observer for cleanup
      observerRef.current = observer;

      // GSAP ScrollTrigger animations
      document
        .querySelectorAll(`[data-animate="${ANIMATION_PRESETS.gsapScale}"]`)
        .forEach(element => {
          const from = parseFloat(element.getAttribute('data-animate-from')) || 1.15;
          const to = parseFloat(element.getAttribute('data-animate-to')) || 1;
          gsap.set(element, { scale: from, overflow: 'hidden' });
          const trigger = ScrollTrigger.create({
            trigger: element,
            start: 'top 80%',
            end: 'center center',
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: self => {
              gsap.set(element, { scale: from + (to - from) * self.progress });
            },
          });
          gsapTriggers.push(trigger);
        });

      // Store GSAP triggers for cleanup
      if (gsapTriggers.length > 0) {
        observerRef.current = {
          disconnect: () => {
            observer.disconnect();
            gsapTriggers.forEach(t => t.kill());
          },
        };
      }
    });

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (observerRef.current) {
        if (typeof observerRef.current.disconnect === 'function') {
          observerRef.current.disconnect();
        }
        observerRef.current = null;
      }
      gsapTriggers.forEach(t => t.kill());
    };
  }, [enabled, mobileBehavior, done]);
}
