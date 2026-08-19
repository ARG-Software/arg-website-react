const DEFAULT_LINK_RENDERER = ({ item, children, className }) => (
  <a href={item.path} className={className}>
    {children}
  </a>
);

export function Breadcrumb({
  items = [],
  renderLink = DEFAULT_LINK_RENDERER,
  variant = 'dark',
  animate = false,
  animationTrigger = 'load',
  animationOrder = 0,
}) {
  if (!items.length) return null;

  const animationAttrs = animate
    ? {
        'data-animate': 'fade-up',
        'data-animate-trigger': animationTrigger,
        'data-animate-order': String(animationOrder),
      }
    : {};

  return (
    <nav
      className={`breadcrumb-nav breadcrumb-nav--${variant}`}
      aria-label="Breadcrumb"
      {...animationAttrs}
    >
      <ol className="breadcrumb">
        {items.map((item, index) => {
          const key = `${item.path || item.label}-${index}`;

          if (item.isTag) {
            return (
              <li key={key} className="tag">
                {item.label}
              </li>
            );
          }

          if (item.path) {
            return (
              <li key={key}>
                {renderLink({ item, children: item.label, className: 'breadcrumb__link' })}
              </li>
            );
          }

          return (
            <li key={key} className={index === items.length - 1 ? 'is-current' : undefined}>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
