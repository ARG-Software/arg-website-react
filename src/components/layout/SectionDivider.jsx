import React from 'react';

export function SectionDivider({
  variant = 'default',
  hideOnMobile = false,
  className = '',
  ...props
}) {
  // New semantic variants: 'default', 'light', 'thin-light', 'white'
  // Backward compatibility for old names: 'partners', 'work', 'blog', 'testimonials', 'hero', 'footer'
  const baseClass = 'line-separate';

  // Map variant names to semantic CSS classes
  const semanticMap = {
    // New semantic variants
    default: 'line-separate--default',
    light: 'line-separate--light',
    'thin-light': 'line-separate--thin-light',
    white: 'line-separate--white',

    // Backward compatibility for old variant names
    partners: 'line-separate--default', // was .is--partners
    work: 'line-separate--default is--work', // was .is--work
    blog: 'line-separate--light', // was .is--blog
    testimonials: 'line-separate--thin-light', // was .is--testemonials
    hero: 'line-separate--white', // was .is--hero
    footer: 'line-separate--light', // was .is--footer
  };

  // Map for old .is--* classes (for backward compatibility with media queries)
  const oldVariantMap = {
    partners: 'partners',
    work: 'work',
    blog: 'blog',
    testimonials: 'testemonials', // CSS uses misspelled 'testemonials'
    hero: 'hero',
    footer: 'footer',
  };

  const semanticClass = semanticMap[variant] || semanticMap.default;
  const oldClass = oldVariantMap[variant] ? `is--${oldVariantMap[variant]}` : '';
  const mobileClass = hideOnMobile ? 'hide-mobile-landscape' : '';

  return (
    <div
      className={`${baseClass} ${semanticClass} ${oldClass} ${mobileClass} ${className}`.trim()}
      {...props}
    />
  );
}
