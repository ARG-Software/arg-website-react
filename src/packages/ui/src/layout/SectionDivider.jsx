export function SectionDivider({
  variant = 'default',
  hideOnMobile = false,
  className = '',
  ...props
}) {
  const baseClass = 'line-separate';

  const semanticMap = {
    default: 'line-separate--default',
    light: 'line-separate--light',
    'thin-light': 'line-separate--thin-light',
    white: 'line-separate--white',
  };

  const semanticClass = semanticMap[variant] || semanticMap.default;
  const mobileClass = hideOnMobile ? 'hide-mobile-landscape' : '';

  return (
    <div
      className={`${baseClass} ${semanticClass} ${mobileClass} ${className}`.trim()}
      {...props}
    />
  );
}
