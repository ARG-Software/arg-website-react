import { useEffect, useRef } from 'react';
import { animateCountUp, getCountUpEnd } from './useCountUp';
import {
  ANIMATION_PRESETS,
  DEFAULT_THRESHOLD,
  DEFAULT_ROOT_MARGIN,
  MOBILE_BREAKPOINT,
} from '../constants';

// Utility functions
const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;

const applyInitialState = (element, preset, selector) => {
  if (preset.initialOpacity) {
    element.style.opacity = preset.initialOpacity;
  }

  if (preset.initialTransform) {
    if (typeof preset.initialTransform === 'string') {
      element.style.transform = preset.initialTransform;
    } else if (preset.initialTransform[selector]) {
      element.style.transform = preset.initialTransform[selector];
    }
  }

  // Special handling for team overlay
  if (preset === ANIMATION_PRESETS['overlay-reveal']) {
    const overlay = element.querySelector('.team_image-overlay');
    if (overlay) {
      overlay.style.setProperty('height', '100%', 'important');
      overlay.style.setProperty('overflow', 'hidden', 'important');
    }
    element.style.setProperty('opacity', '0', 'important');
  }

  // Special handling for FAQ items
  if (selector.includes('faq_item')) {
    element.style.setProperty('opacity', '0', 'important');
    element.style.setProperty('transform', 'translate3d(0, 1rem, 0)', 'important');
  }
};

const animateElement = (element, preset, selector, index = 0) => {
  const delay = getStaggerDelay(preset, selector, element, index);

  setTimeout(() => {
    // Remove !important flags
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('height');
    element.style.removeProperty('overflow');

    // Apply transition
    if (preset.transition) {
      element.style.transition = preset.transition;
    } else if (preset.transitions) {
      const matchingTransition = Object.entries(preset.transitions).find(
        ([key]) => element.matches(key) || element.closest(key)
      );
      if (matchingTransition) {
        element.style.transition = matchingTransition[1];
      }
    }

    // Animate to final state
    element.style.opacity = '1';
    element.style.transform = 'translate3d(0, 0, 0)';

    // Special handling for team overlay
    if (preset === ANIMATION_PRESETS['overlay-reveal']) {
      const overlay = element.querySelector('.team_image-overlay');
      if (overlay) {
        overlay.style.transition = preset.transition;
        overlay.style.height = '0%';
      }
    }

    // Handle class toggle animations
    if (preset.classMap) {
      const matchingClass = Object.keys(preset.classMap).find(className =>
        element.classList.contains(className)
      );
      if (matchingClass) {
        element.classList.add(preset.classMap[matchingClass]);
      }
    }

    // Handle number count-up
    if (preset === ANIMATION_PRESETS['width-countup']) {
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
  }, delay);

  // Animate child elements if defined
  if (preset.childSelectors && preset.childSelectors[selector]) {
    const childSelectors = preset.childSelectors[selector];
    if (childSelectors && childSelectors.length) {
      childSelectors.forEach(childSelector => {
        if (!childSelector) return; // Skip null entries (e.g., faq_item: null)
        const children = element.querySelectorAll(childSelector);
        children.forEach((child, childIndex) => {
          const childDelay = getStaggerDelay(preset, selector, child, childIndex) + delay;
          setTimeout(() => {
            child.style.removeProperty('opacity');
            child.style.removeProperty('transform');
            child.style.removeProperty('height');
            child.style.removeProperty('overflow');
            if (preset.transition) {
              child.style.transition = preset.transition;
            } else if (preset.transitions) {
              const matchingTransition = Object.entries(preset.transitions).find(
                ([key]) => child.matches(key) || child.closest(key)
              );
              if (matchingTransition) {
                child.style.transition = matchingTransition[1];
              }
            }
            child.style.opacity = '1';
            child.style.transform = 'translate3d(0, 0, 0)';
          }, childDelay);
        });
      });
    }
  }
};

const getStaggerDelay = (preset, selector, element, index) => {
  if (!preset.staggerDelay) return 0;

  // If this element is a parent that has child selectors defined, don't apply stagger to parent
  if (preset.childSelectors && preset.childSelectors[selector] && element.matches(selector)) {
    return 0;
  }

  if (typeof preset.staggerDelay === 'number') {
    return preset.staggerDelay * index;
  }

  if (typeof preset.staggerDelay === 'object') {
    // Find matching selector
    for (const [key, delay] of Object.entries(preset.staggerDelay)) {
      if (element.matches(key) || element.closest(key)) {
        return delay * index;
      }
    }

    // Check for selector-specific delay
    if (preset.staggerDelay[selector]) {
      return preset.staggerDelay[selector] * index;
    }
  }

  return 0;
};

// Main hook
export function useScrollAnimations(config = {}) {
  const {
    enabled = true,
    mobileBehavior = 'adaptive', // 'adaptive', 'same', 'disabled'
    includePresets = Object.keys(ANIMATION_PRESETS),
    excludePresets = [],
    classMapOverrides = {},
  } = config;

  const observerRef = useRef(null);
  const mountedRef = useRef(true);

  const includePresetsKey = includePresets.join(',');
  const excludePresetsKey = excludePresets.join(',');

  useEffect(() => {
    if (!enabled) return;

    // Check mobile behavior
    const mobile = isMobile();
    if (mobileBehavior === 'disabled' && mobile) return;

    mountedRef.current = true;

    // Initialize after DOM is ready
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;

      // Merge class map overrides
      const mergedPresets = { ...ANIMATION_PRESETS };
      if (classMapOverrides && Object.keys(classMapOverrides).length > 0) {
        if (mergedPresets['class-toggle']) {
          mergedPresets['class-toggle'] = {
            ...mergedPresets['class-toggle'],
            classMap: {
              ...mergedPresets['class-toggle'].classMap,
              ...classMapOverrides,
            },
          };
        }
      }

      // Create observers for each preset
      const presetKeys = includePresets.filter(
        preset => !excludePresets.includes(preset) && mergedPresets[preset]
      );

      presetKeys.forEach(presetKey => {
        const preset = mergedPresets[presetKey];

        // Skip mobile-specific presets if needed
        if (mobile && preset.mobileBehavior === 'disabled') return;

        // Create observer for this preset
        const observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (!entry.isIntersecting) return;

              const element = entry.target;

              // Apply animation
              const index = parseInt(element.dataset.animationIndex) || 0;
              const selector = element.dataset.animationSelector || preset.selectors[0];
              animateElement(element, preset, selector, index);

              // Unobserve after animation
              observer.unobserve(element);
            });
          },
          {
            threshold: preset.threshold || DEFAULT_THRESHOLD,
            rootMargin: preset.rootMargin || DEFAULT_ROOT_MARGIN,
          }
        );

        // Find and observe elements
        preset.selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach((element, index) => {
            // Skip excluded selectors
            if (
              preset.excludeSelectors?.some(
                exclude => element.matches(exclude) || element.closest(exclude)
              )
            ) {
              return;
            }
            // Filter data-w-id elements (only those with opacity:0 or transform:100%)
            if (presetKey === 'general-reveal' && selector === '[data-w-id]') {
              const computedStyle = window.getComputedStyle(element);
              if (
                !(
                  computedStyle.opacity === '0' ||
                  (computedStyle.transform && computedStyle.transform.includes('100%'))
                )
              ) {
                return;
              }
              // Exclude contact section headings (handled by transform-reset preset)
              if (
                element.tagName === 'H2' &&
                (element.closest('.cta-wrapper') || element.closest('.formtext'))
              ) {
                return;
              }
            }

            // Apply initial state
            applyInitialState(element, preset, selector);

            // Force reflow for CSS !important overrides
            if (selector.includes('team_image-wrapper') || selector.includes('faq_item')) {
              element.offsetHeight;
            }

            // Store animation data
            element.dataset.animationIndex = index;
            element.dataset.animationSelector = selector;

            // Observe element
            observer.observe(element);

            // If there are child selectors, set up child animations
            if (preset.childSelectors && preset.childSelectors[selector]) {
              const childSelectors = preset.childSelectors[selector];
              if (childSelectors) {
                childSelectors.forEach(childSelector => {
                  if (!childSelector) return; // Skip null entries
                  const children = element.querySelectorAll(childSelector);
                  children.forEach(child => {
                    applyInitialState(child, preset, selector);
                    // Child will be animated via parent observer
                  });
                });
              }
            }
          });
        });

        // Store observer for cleanup
        if (!observerRef.current) observerRef.current = [];
        observerRef.current.push(observer);
      });
    });

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (observerRef.current) {
        observerRef.current.forEach(observer => observer.disconnect());
        observerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mobileBehavior, classMapOverrides, includePresetsKey, excludePresetsKey]);
}
