const VARIANT_CLASSES = {
  white: 'base-card--white',
  light: 'base-card--light',
  dark: 'base-card--dark',
  glass: 'base-card--glass',
};

const PADDING_CLASSES = {
  none: 'base-card--padding-none',
  sm: 'base-card--padding-sm',
  md: 'base-card--padding-md',
  lg: 'base-card--padding-lg',
  xl: 'base-card--padding-xl',
};

const RADIUS_CLASSES = {
  sm: 'base-card--radius-sm',
  md: 'base-card--radius-md',
  lg: 'base-card--radius-lg',
  xl: 'base-card--radius-xl',
};

const HOVER_CLASSES = {
  none: '',
  lift: 'base-card--hover-lift',
};

export function BaseCard({
  as: Component = 'article',
  children,
  className = '',
  variant = 'white',
  padding = 'md',
  radius = 'xl',
  hover = 'lift',
  // A gradient line sweeps across the top edge on hover and keyboard focus
  accentLine = false,
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
  ...props
}) {
  const classes = [
    'base-card',
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.white,
    PADDING_CLASSES[padding] ?? PADDING_CLASSES.md,
    RADIUS_CLASSES[radius] ?? RADIUS_CLASSES.xl,
    HOVER_CLASSES[hover] ?? HOVER_CLASSES.lift,
    accentLine ? 'base-card--accent-line' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <Component className={classes} {...animationAttrs} {...props}>
      {children}
    </Component>
  );
}
