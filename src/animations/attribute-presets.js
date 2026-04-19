// Attribute-based animation presets
export const DEFAULT_THRESHOLD = 0.15;
export const DEFAULT_ROOT_MARGIN = '0px 0px -10% 0px';
export const MOBILE_BREAKPOINT = 767; // px

// Preset configurations
export const ATTRIBUTE_PRESETS = {
  // Basic fade up with optional stagger
  'fade-up': {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 2rem, 0)',
    transition:
      'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Slide up from bottom (100%)
  'slide-up': {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 100%, 0)',
    transition:
      'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Width expansion with count-up (for stats)
  'width-countup': {
    threshold: 0.3,
    rootMargin: '0px 0px -10% 0px',
    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
    countUpDuration: 1800, // ms
  },

  // Overlay height collapse (team images)
  'overlay-reveal': {
    threshold: 0.1,
    rootMargin: DEFAULT_ROOT_MARGIN,
    transition: 'height 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Class toggle animations (pp-animate, bp-animate, etc.)
  'class-toggle': {
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
    // Class mapping will be derived from element's class list
  },

  // Footer animation
  'footer-reveal': {
    threshold: 0.1,
    rootMargin: '0px 0px 0px 0px',
    transition:
      'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    staggerDelay: 150, // ms between children
  },

  // Social section reveal
  'social-reveal': {
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
    transition:
      'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 1.5rem, 0)',
  },
};

// Mapping of class suffixes to visible class names
export const CLASS_SUFFIX_MAP = {
  cp: 'cp-visible', // CareersPage
  pp: 'pp-visible', // PartnersPage
  bp: 'bp-visible', // BlogPostPage
  blp: 'blp-visible', // BlogPage
  prp: 'prp-visible', // ProjectsPage
  tp: 'tp-visible', // TeamPage
  reveal: 'is-revealed', // Generic reveal
};

// Get visible class for an element based on its class list
export function getVisibleClassForElement(element) {
  // Check for data-animate-class attribute first
  const dataClass = element.getAttribute('data-animate-class');
  if (dataClass && CLASS_SUFFIX_MAP[dataClass]) {
    return CLASS_SUFFIX_MAP[dataClass];
  }

  // Find class ending with -animate
  const classList = Array.from(element.classList);
  const animateClass = classList.find(cls => cls.endsWith('-animate'));
  if (animateClass) {
    const suffix = animateClass.replace('-animate', '');
    if (CLASS_SUFFIX_MAP[suffix]) {
      return CLASS_SUFFIX_MAP[suffix];
    }
  }

  // Default fallback
  return 'is-visible';
}
