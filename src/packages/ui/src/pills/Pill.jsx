const VARIANT_CLASSES = {
  light: 'pill--light',
  white: 'pill--white',
  dark: 'pill--dark',
  outline: 'pill--outline',
  muted: 'pill--muted',
  glass: 'pill--glass',
  custom: 'pill--custom',
};

const SIZE_CLASSES = {
  xs: 'pill--xs',
  sm: 'pill--sm',
  md: 'pill--md',
  lg: 'pill--lg',
};

function getPillClasses({ variant, size, interactive = false, active = false, className = '' }) {
  return [
    'pill',
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.light,
    SIZE_CLASSES[size] ?? SIZE_CLASSES.sm,
    interactive ? 'pill--interactive' : '',
    active ? 'pill--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Pill({
  as: Component = 'span',
  children,
  className = '',
  variant = 'light',
  size = 'sm',
  active = false,
  iconBefore,
  iconAfter,
  ...props
}) {
  return (
    <Component className={getPillClasses({ variant, size, active, className })} {...props}>
      {iconBefore && <span className="pill__icon pill__icon--before">{iconBefore}</span>}
      <span className="pill__label">{children}</span>
      {iconAfter && <span className="pill__icon pill__icon--after">{iconAfter}</span>}
    </Component>
  );
}

export function PillButton({
  as: Component = 'button',
  children,
  className = '',
  variant = 'light',
  size = 'sm',
  active = false,
  iconBefore,
  iconAfter,
  type,
  ...props
}) {
  const buttonProps = Component === 'button' ? { type: type ?? 'button' } : {};

  return (
    <Component
      className={getPillClasses({ variant, size, interactive: true, active, className })}
      {...buttonProps}
      {...props}
    >
      {iconBefore && <span className="pill__icon pill__icon--before">{iconBefore}</span>}
      <span className="pill__label">{children}</span>
      {iconAfter && <span className="pill__icon pill__icon--after">{iconAfter}</span>}
    </Component>
  );
}
