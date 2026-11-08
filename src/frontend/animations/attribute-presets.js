// Attribute-based animation presets
//
// Reveals follow one pattern across the site, by role:
// - fade-up: titles, text, cards, lists and buttons (the default for every scope)
// - divider-expander-show: divider lines
// - slide-up-rotate: page header title lines
// - slide-in-left / slide-in-right: home project cards, each from its own side (fade-up on phones)
// - width-countup, overlay-reveal and gsap-scale: stats, team photos and scroll-scaled images
// Timing is shared too: see useScrollAnimations for how the steps below are applied.

// Time between items revealing together
export const REVEAL_STEP_MS = 150;
// Page intros (load-triggered headers) take a slower step so they read as a sequence
export const REVEAL_INTRO_STEP_MS = 250;
// Longer scroll cascades stop adding delay after this many steps, so the last items never lag behind
export const REVEAL_MAX_STEPS = 6;

export const ANIMATION_PRESETS = {
  fadeUp: 'fade-up',
  widthCountup: 'width-countup',
  overlayReveal: 'overlay-reveal',
  slideUpRotate: 'slide-up-rotate',
  slideInLeft: 'slide-in-left',
  slideInRight: 'slide-in-right',
  dividerExpanderShow: 'divider-expander-show',
  gsapScale: 'gsap-scale',
  // Hover presets, styled in hover.css
  slotText: 'slot-text',
  lift: 'lift',
  circleGrow: 'circle-grow',
};

// Preset configurations
export const ATTRIBUTE_PRESETS = {
  [ANIMATION_PRESETS.fadeUp]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 2rem, 0)',
    transition: 'opacity 0.8s var(--ease-out-cubic), transform 0.8s var(--ease-out-cubic)',
  },

  // Width expansion with count-up (for stats)
  [ANIMATION_PRESETS.widthCountup]: {
    transition: 'width 1s var(--ease-out-expo)',
    countUpDuration: 2500, // ms
  },

  // Overlay height collapse (team images)
  [ANIMATION_PRESETS.overlayReveal]: {
    transition: 'height 0.9s var(--ease-out-expo)',
  },

  // Masked line rising with a slight rotation (distance configurable via data-animate-distance)
  [ANIMATION_PRESETS.slideUpRotate]: {
    initialTransform: 'translate3d(0, var(--distance, 100%), 0) rotateZ(5deg)',
    transition: 'transform 0.8s var(--ease-out-cubic)',
  },

  // Slide in from the left or right
  [ANIMATION_PRESETS.slideInLeft]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(-50%, 0, 0)',
    transition: 'opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo)',
  },

  [ANIMATION_PRESETS.slideInRight]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(50%, 0, 0)',
    transition: 'opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo)',
  },

  // Horizontal scale animation (divider expand)
  [ANIMATION_PRESETS.dividerExpanderShow]: {
    initialTransform: 'scale3d(0.1, 1, 1)',
    transition: 'transform 0.8s var(--ease-out-cubic)',
  },

  // GSAP scale on scroll (for images), driven by ScrollTrigger rather than a reveal
  [ANIMATION_PRESETS.gsapScale]: {},
};

// Hover preset settings read by components; presets that are pure CSS (lift, circle-grow)
// keep their settings as custom properties in hover.css
export const HOVER_PRESETS = {
  // Each letter rolls up like a slot machine reel, one after another, and the letters that
  // roll in carry the brand gradient across the word
  [ANIMATION_PRESETS.slotText]: {
    duration: '0.4s',
    stagger: '0.015s',
    ease: 'var(--ease-out-expo)',
    colors: ['var(--arg-color-red)', 'var(--arg-color-magenta)', 'var(--arg-color-violet)'],
  },
};
