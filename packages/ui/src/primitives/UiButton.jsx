export function UiButton({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const buttonClassName = ['ui-button', `ui-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClassName} type={type} {...props}>
      {children}
    </button>
  );
}
