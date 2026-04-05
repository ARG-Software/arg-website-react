// Animation constants
export const DEFAULT_THRESHOLD = 0.15;
export const DEFAULT_ROOT_MARGIN = '0px 0px -10% 0px';
export const MOBILE_BREAKPOINT = 767; // px

// Animation presets mapping
export const ANIMATION_PRESETS = {
  // Fade up with staggered children (services)
  'services-reveal': {
    selectors: ['.services_item'],
    childSelectors: {
      '.services_item': [
        '.services_item_number',
        '.services_item_heading',
        '.services_item_content',
      ],
    },
    staggerDelay: {
      '.services_item': 120, // ms between child elements
    },
    initialTransform: 'translate3d(0, 2.5rem, 0)',
    initialOpacity: '0',
    transition:
      'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // FAQ items with earlier appearance
  'faq-reveal': {
    selectors: ['.faq_item'],
    staggerDelay: 80, // ms between items
    initialTransform: 'translate3d(0, 1rem, 0)',
    initialOpacity: '0',
    transition:
      'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1, // Lower threshold for earlier appearance
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Fade up single element (projects, articles promo)
  'fade-up': {
    selectors: [
      '.projects_item_wrap',
      '.articles-promo_header',
      '.articles-promo_hero',
      '.articles-promo_cards-grid',
      '.articles-promo_footer',
      '.section_articles-promo .social-section_header',
    ],
    initialTransform: {
      '.projects_item_wrap': 'translate3d(0, 3rem, 0)',
      '.articles-promo_header': 'translate3d(0, 2.5rem, 0)',
      '.articles-promo_hero': 'translate3d(0, 2.5rem, 0)',
      '.articles-promo_cards-grid': 'translate3d(0, 3rem, 0)',
      '.articles-promo_footer': 'translate3d(0, 2rem, 0)',
      '.section_articles-promo .social-section_header': 'translate3d(0, 2.5rem, 0)',
    },
    initialOpacity: '0',
    transition:
      'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Overlay height collapse (team images)
  'overlay-reveal': {
    selectors: ['.team_image-wrapper'],
    threshold: 0.1, // Lower threshold for earlier appearance
    rootMargin: DEFAULT_ROOT_MARGIN,
    transition: 'height 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Slide up transform (testimonials)
  'slide-up': {
    selectors: ['.testemonials-item'],
    childSelectors: {
      '.testemonials-item': ['.text-size-24-18', '.testemonials-item_name'],
    },
    staggerDelay: {
      '.testemonials-item .testemonials-item_name': 400, // ms delay for author
    },
    initialTransform: 'translate3d(0, 100%, 0)',
    transitions: {
      '.text-size-24-18': 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
      '.testemonials-item_name': 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    threshold: 0.1, // Lower threshold for earlier appearance
    rootMargin: '0px 0px -10% 0px',
  },

  // Width expansion + count-up (work stats)
  'width-countup': {
    selectors: ['.work_items-wrapper .work-item'],
    threshold: 0.3, // Higher threshold for stats
    rootMargin: '0px 0px -10% 0px',
    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
    countUpDuration: 1800, // ms
  },

  // Transform reset (CTA headings, work heading)
  'transform-reset': {
    selectors: ['.work_header-wrapper', '.cta-wrapper', '.formtext'],
    childSelectors: {
      '.work_header-wrapper': ['.work_heading'],
      '.cta-wrapper': ['.header-animation h2'],
      '.formtext': ['.header-animation h2'],
    },
    staggerDelay: {
      '.header-animation h2': 120, // ms between headings
    },
    transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1, // Lower threshold for earlier contact heading appearance
    rootMargin: '0px 0px -10% 0px',
  },

  // Class toggle animations (page-specific)
  'class-toggle': {
    selectors: [
      '.pp-animate',
      '.ap-animate',
      '.alp-animate',
      '.cp-reveal',
      '.cp-animate',
      '.pp-reveal',
      '.reveal',
    ],
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
    classMap: {
      'pp-animate': 'pp-visible',
      'ap-animate': 'ap-visible',
      'alp-animate': 'alp-visible',
      'cp-reveal': 'cp-visible',
      'cp-animate': 'cp-visible',
      'pp-reveal': 'is-revealed',
      reveal: 'is-revealed',
    },
    // For cp-reveal/cp-animate, also apply inline styles (handled in unifiedReveals)
  },

  // General elements with data-w-id
  'general-reveal': {
    selectors: [
      '[data-w-id]', // Filtered in setup
      '.about_list',
      '.nav-component',
      '.work_paragraph',
      '.team_heading',
      '.heading-style-h5',
      '.subtitle-team',
      '.testemonials-item_dot',
      '.text-size-24-18',
      '.form-header',
      '.form-button',
      '.button-contact',
      '.section_blog .heading',
      '.section_blog h2',
      '.faq_header',
    ],
    excludeSelectors: ['.services_illustration', '.hero_wrap'],
    transition:
      'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Footer animation
  'footer-reveal': {
    selectors: ['.footer_copywrite-content'],
    childSelectors: {
      '.footer_copywrite-content': [
        '.hide-mobile-landscape',
        '.text-block-2',
        '.show-mobile-landscape',
      ],
    },
    staggerDelay: 150, // ms between children
    transition:
      'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    threshold: 0.1, // Lower threshold for footer
    rootMargin: '0px 0px 0px 0px',
  },

  // Social section reveal
  'social-reveal': {
    selectors: ['.section_blog .blog-component'],
    childSelectors: {
      '.section_blog .blog-component': [
        '.section_blog .social-section_header',
        '.swiper_blog-component',
      ],
    },
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 1.5rem, 0)',
    staggerDelay: {
      '.swiper_blog-component': 250, // ms delay for embed
    },
    transition:
      'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },
};
