import AppLink from './AppLink';

/**
 * Breadcrumb component for subpages
 * @param {Object} props
 * @param {Array} props.items - Array of breadcrumb items: { label: string, path?: string, isTag?: boolean }
 */
export function Breadcrumb({
  items = [],
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
    <nav className="breadcrumb-nav" aria-label="Breadcrumb" {...animationAttrs}>
      <ol className="breadcrumb">
        {items.map((item, index) => {
          const isTag = item.isTag || false;

          if (isTag) {
            return (
              <li key={index} className="tag">
                {item.label}
              </li>
            );
          }

          if (item.path) {
            return (
              <li key={index}>
                <AppLink to={item.path} transition="curtain">
                  {item.label}
                </AppLink>
              </li>
            );
          }

          return (
            <li key={index} className={index === items.length - 1 ? 'is-current' : undefined}>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
