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

// Apply initial styles based on preset
const applyInitialState = (element, preset, presetName) => {
  if (preset.initialOpacity) {
    element.style.opacity = preset.initialOpacity;
  }

  if (preset.initialTransform) {
    element.style.transform = preset.initialTransform;
  }

  // Special handling for team overlay
  if (presetName === 'overlay-reveal') {
    const overlay = element.querySelector('.team_image-overlay');
    if (overlay) {
      overlay.style.setProperty('height', '100%', 'important');
      overlay.style.setProperty('overflow', 'hidden', 'important');
    }
    element.style.setProperty('opacity', '0', 'important');
  }
};

// Animate element when it becomes visible
const animateElement = (element, preset, presetName, index = 0) => {
  const delay = preset.staggerDelay ? preset.staggerDelay * index : 0;

  setTimeout(() => {
    // Remove !important flags
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('height');
    element.style.removeProperty('overflow');

    // Apply transition
    if (preset.transition) {
      element.style.transition = preset.transition;
    }

    // Animate to final state
    if (preset.initialOpacity || preset.initialTransform) {
      element.style.opacity = '1';
      element.style.transform = 'translate3d(0, 0, 0)';
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
  }, delay);
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
      const elements = [];

      // Attribute-based elements
      document.querySelectorAll('[data-animate]').forEach(element => {
        const presetName = element.getAttribute('data-animate');
        const preset = ATTRIBUTE_PRESETS[presetName];
        if (preset) {
          elements.push({ element, preset, presetName });
        }
      });

      // Class-based elements (backward compatibility)
      document.querySelectorAll('[class*="-animate"]').forEach(element => {
        const classList = Array.from(element.classList);
        const animateClass = classList.find(cls => cls.endsWith('-animate'));
        if (animateClass) {
          // Check if already handled by data-animate
          if (!element.hasAttribute('data-animate')) {
            elements.push({
              element,
              preset: ATTRIBUTE_PRESETS['class-toggle'],
              presetName: 'class-toggle',
            });
          }
        }
      });

      // Special elements that need animation but don't have markers
      // Footer reveal
      const footerContent = document.querySelector('.footer_copywrite-content');
      if (footerContent && !footerContent.hasAttribute('data-animate')) {
        elements.push({
          element: footerContent,
          preset: ATTRIBUTE_PRESETS['footer-reveal'],
          presetName: 'footer-reveal',
        });
      }

      // Create observer
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach((entry, entryIndex) => {
            if (!entry.isIntersecting) return;

            const element = entry.target;
            const elementData = elements.find(e => e.element === element);
            if (elementData) {
              const { preset, presetName } = elementData;
              animateElement(element, preset, presetName, entryIndex);
              observer.unobserve(element);
            }
          });
        },
        {
          threshold: DEFAULT_THRESHOLD,
          rootMargin: DEFAULT_ROOT_MARGIN,
        }
      );

      // Apply initial state and observe each element
      elements.forEach(({ element, preset, presetName }, _index) => {
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
