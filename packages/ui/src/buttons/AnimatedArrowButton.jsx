import { arrowSvg } from '../icons/SocialIcons.jsx';

export function AnimatedArrowButton({
  children,
  hoverText = children,
  href,
  className = '',
  variant = 'dark',
  size = 'md',
  type = 'button',
  disabled = false,
  target,
  rel,
  onClick,
  ...props
}) {
  const buttonClassName = [
    'button-base',
    `button-base--${variant}`,
    size !== 'md' ? `button-base--${size}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      <span className="button-base_text_wrap">
        <span className="button-base__button-text">{children}</span>
        <span className="button-base__button-text is-animated">{hoverText}</span>
      </span>
      <span className="arrow_icon-embed" aria-hidden="true">
        {arrowSvg}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        className={buttonClassName}
        href={href}
        target={target}
        rel={rel}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={buttonClassName}
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
}
