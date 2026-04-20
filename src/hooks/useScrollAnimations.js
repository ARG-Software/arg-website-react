import { useEffect, useRef } from 'react';
import { animateCountUp, getCountUpEnd } from './useCountUp';
import {
  ATTRIBUTE_PRESETS,
  DEFAULT_THRESHOLD,
  DEFAULT_ROOT_MARGIN,
  MOBILE_BREAKPOINT,
  getVisibleClassForElement,
} from '../animations/attribute-presets';

// Utility functions
const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;

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
const getInheritedPreset = (element, _scope) => {
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

// Get animation configuration with inheritance from nearest ancestors
const getAnimationConfig = element => {
  // Get inherited values with fallbacks
  const trigger =
    getInheritedAttribute(element, 'data-animate-trigger') ||
    getInheritedAttribute(element, 'data-animate-default-trigger') ||
    'scroll';

  const delayStr =
    getInheritedAttribute(element, 'data-animate-delay') ||
    getInheritedAttribute(element, 'data-animate-default-delay');
  const delay = delayStr ? parseInt(delayStr) : 0;

  const staggerStr =
    getInheritedAttribute(element, 'data-animate-stagger') ||
    getInheritedAttribute(element, 'data-animate-default-stagger');
  const stagger = staggerStr ? parseInt(staggerStr) : 0;

  const distance =
    getInheritedAttribute(element, 'data-animate-distance') ||
    getInheritedAttribute(element, 'data-animate-default-distance');

  const rotate =
    getInheritedAttribute(element, 'data-animate-rotate') ||
    getInheritedAttribute(element, 'data-animate-default-rotate');

  return { trigger, delay, stagger, distance, rotate };
};

// Calculate total delay for element using parent-based or scope-based timing
const getTotalDelay = (element, orderIndex) => {
  const config = getAnimationConfig(element);
  const parent = element.parentElement;

  // Priority 1: Parent-based staggering (most specific)
  if (parent && parent.hasAttribute('data-animate-stagger')) {
    const parentStagger = parseInt(parent.getAttribute('data-animate-stagger')) || 0;
    const parentDelay = parseInt(parent.getAttribute('data-animate-delay')) || 0;
    const childIndex = Array.from(parent.children).indexOf(element);
    return parentDelay + parentStagger * childIndex;
  }

  // Priority 2: Scope-based timing
  const scope = findAnimationScope(element);
  if (scope) {
    return config.delay + config.stagger * orderIndex;
  }

  // Priority 3: Element-based staggering (individual stagger attribute)
  let totalDelay = config.delay;
  if (config.stagger > 0) {
    totalDelay += config.stagger * orderIndex;
  }

  return totalDelay;
};

// Apply custom CSS properties based on element attributes
const applyCustomProperties = (element, preset) => {
  const config = getAnimationConfig(element);

  if (
    config.distance &&
    preset.initialTransform &&
    preset.initialTransform.includes('var(--distance')
  ) {
    element.style.setProperty('--distance', config.distance);
  }

  if (config.rotate && preset.initialTransform && preset.initialTransform.includes('rotateZ')) {
    // For slide-up-rotate, we need to replace the rotate value
    // This is handled in applyInitialState via custom transform
  }
};

// Apply initial styles based on preset and element attributes
const applyInitialState = (element, preset, presetName) => {
  const config = getAnimationConfig(element);

  // Apply custom CSS properties (e.g., --distance)
  applyCustomProperties(element, preset);

  // Handle custom rotate for slide-up-rotate preset
  let initialTransform = preset.initialTransform;
  if (presetName === 'slide-up-rotate' && config.rotate) {
    // Replace the rotate value in the transform
    initialTransform = preset.initialTransform.replace(
      'rotateZ(5deg)',
      `rotateZ(${config.rotate})`
    );
  }

  if (preset.initialOpacity) {
    element.style.setProperty('opacity', preset.initialOpacity, 'important');
  }

  if (initialTransform) {
    element.style.setProperty('transform', initialTransform, 'important');
  }

  // Special handling for team overlay (height collapse animation)
  if (presetName === 'overlay-reveal') {
    const overlay = element.querySelector('.team_image-overlay');
    if (overlay) {
      overlay.style.setProperty('height', '100%', 'important');
      overlay.style.setProperty('overflow', 'hidden', 'important');
    }
    element.style.setProperty('opacity', '0', 'important');
  }
};

// Get final transform state based on preset
const getFinalTransform = presetName => {
  if (presetName === 'slide-up-rotate') {
    return 'translate3d(0, 0, 0) rotateZ(0deg)';
  }
  if (presetName === 'divider-expander-show') {
    return 'scale3d(1, 1, 1)';
  }
  return 'translate3d(0, 0, 0)';
};

// Animate element when it becomes visible
const animateElement = (element, preset, presetName, index = 0) => {
  const totalDelay = getTotalDelay(element, index);

  setTimeout(() => {
    // Remove !important flags
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('height');
    element.style.removeProperty('overflow');

    // Apply transition (override CSS !important)
    if (preset.transition) {
      element.style.setProperty('transition', preset.transition, 'important');
    }

    // Animate to final state (override CSS !important during animation)
    if (preset.initialOpacity || preset.initialTransform) {
      element.style.setProperty('opacity', '1', 'important');
      element.style.setProperty('transform', getFinalTransform(presetName), 'important');

      // Remove !important after transition so CSS hover states can work
      const onTransitionEnd = () => {
        element.style.opacity = '1';
        element.style.transform = getFinalTransform(presetName);
        element.style.transition = preset.transition || '';
        element.removeEventListener('transitionend', onTransitionEnd);
      };

      element.addEventListener('transitionend', onTransitionEnd);
      // Fallback: also remove !important after max transition duration
      const maxDuration = getMaxTransitionDuration(preset.transition);
      if (maxDuration > 0) {
        setTimeout(() => {
          element.style.opacity = '1';
          element.style.transform = getFinalTransform(presetName);
          element.style.transition = preset.transition || '';
        }, maxDuration);
      }
    }

    // Special handling for team overlay
    if (presetName === 'overlay-reveal') {
      const overlay = element.querySelector('.team_image-overlay');
      if (overlay) {
        overlay.style.transition = preset.transition;
        overlay.style.height = '0%';
      }
    }

    // Handle class toggle animations (elements with -animate class)
    const visibleClass = getVisibleClassForElement(element);
    element.classList.add(visibleClass);

    // Handle number count-up
    if (presetName === 'width-countup') {
      const line = element.querySelector('.work-item_line');
      if (line) {
        line.style.transition = preset.transition;
        line.style.width = '100%';
      }

      const numEl = element.querySelector('[fs-numbercount-element="number"]');
      if (numEl) {
        const end = getCountUpEnd(numEl);
        if (end !== null) {
          setTimeout(() => animateCountUp(numEl, end, preset.countUpDuration), 300);
        }
      }
    }
  }, totalDelay);
};

// Main hook - attribute-based animation system
export function useScrollAnimations(config = {}) {
  const {
    enabled = true,
    mobileBehavior = 'adaptive', // 'adaptive', 'same', 'disabled'
  } = config;

  const observerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    // Check mobile behavior
    const mobile = isMobile();
    if (mobileBehavior === 'disabled' && mobile) return;

    mountedRef.current = true;

    // Initialize after DOM is ready
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;

      // Find all elements that need animation
      // 1. Elements with data-animate attribute
      // 2. Elements with class ending in -animate (pp-animate, bp-animate, etc.)
      const scrollElements = [];
      const loadElements = [];

      // Attribute-based elements with scope inheritance
      const scopeMap = new Map(); // scope element → array of {element, originalIndex}

      // First pass: collect all animated elements with original document order
      document
        .querySelectorAll('[data-animate], [data-animate-order]')
        .forEach((element, originalIndex) => {
          const scope = findAnimationScope(element);
          if (!scopeMap.has(scope)) {
            scopeMap.set(scope, []);
          }
          scopeMap.get(scope).push({ element, originalIndex });
        });

      // Second pass: process each scope, sort by order, assign indices
      scopeMap.forEach((items, scope) => {
        // Sort items within scope: by data-animate-order then original document position
        items.sort((a, b) => {
          const orderA = parseInt(a.element.getAttribute('data-animate-order')) || 0;
          const orderB = parseInt(b.element.getAttribute('data-animate-order')) || 0;
          if (orderA !== orderB) return orderA - orderB;
          // Same order value, maintain original document order
          return a.originalIndex - b.originalIndex;
        });

        // Process each element in sorted order
        items.forEach(({ element }, _scopeOrderIndex) => {
          // Get inherited preset name (element attribute or scope default)
          const presetName = getInheritedPreset(element, scope);

          const preset = ATTRIBUTE_PRESETS[presetName];
          if (preset) {
            const config = getAnimationConfig(element);
            // Use data-animate-order value for timing (same order = same timing)
            const orderValue = parseInt(element.getAttribute('data-animate-order')) || 0;
            const animationData = { element, preset, presetName, orderIndex: orderValue };

            if (config.trigger === 'load') {
              loadElements.push(animationData);
            } else {
              scrollElements.push(animationData);
            }
          }
        });
      });

      // Class-based elements (backward compatibility) - always scroll triggered
      document.querySelectorAll('[class*="-animate"]').forEach(element => {
        const classList = Array.from(element.classList);
        const animateClass = classList.find(cls => cls.endsWith('-animate'));
        if (animateClass) {
          // Check if already handled by data-animate
          if (!element.hasAttribute('data-animate')) {
            scrollElements.push({
              element,
              preset: ATTRIBUTE_PRESETS['class-toggle'],
              presetName: 'class-toggle',
              orderIndex: 0, // class-based elements don't support ordering
            });
          }
        }
      });

      // Animate load-triggered elements immediately
      loadElements.forEach(({ element, preset, presetName, orderIndex }) => {
        applyInitialState(element, preset, presetName);
        animateElement(element, preset, presetName, orderIndex);
      });

      // Create observer for scroll-triggered elements
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach((entry, _entryIndex) => {
            if (!entry.isIntersecting) return;

            const element = entry.target;
            const elementData = scrollElements.find(e => e.element === element);
            if (elementData) {
              const { preset, presetName, orderIndex } = elementData;
              animateElement(element, preset, presetName, orderIndex);
              observer.unobserve(element);
            }
          });
        },
        {
          threshold: DEFAULT_THRESHOLD,
          rootMargin: DEFAULT_ROOT_MARGIN,
        }
      );

      // Apply initial state and observe each scroll element
      scrollElements.forEach(({ element, preset, presetName, orderIndex: _orderIndex }) => {
        applyInitialState(element, preset, presetName);

        // Force reflow for CSS !important overrides
        if (presetName === 'overlay-reveal') {
          element.offsetHeight;
        }

        observer.observe(element);
      });

      // Store observer for cleanup
      observerRef.current = observer;
    });

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [enabled, mobileBehavior]);
}
