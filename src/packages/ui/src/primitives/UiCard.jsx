export function UiCard({
  as: Component = 'section',
  children,
  className = '',
  tone = 'default',
  ...props
}) {
  const cardClassName = ['ui-card', `ui-card--${tone}`, className].filter(Boolean).join(' ');

  return (
    <Component className={cardClassName} {...props}>
      {children}
    </Component>
  );
}
