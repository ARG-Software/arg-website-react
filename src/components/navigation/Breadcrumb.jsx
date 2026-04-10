import AppLink from '../links/AppLink';

/**
 * Breadcrumb component matching Article page style exactly
 * @param {Object} props
 * @param {Array} props.items - Array of breadcrumb items: { label: string, path?: string, isTag?: boolean }
 */
export function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="bp-hero-meta bp-hero-fade" aria-label="Breadcrumb">
      <ol className="bp-breadcrumb">
        {items.map((item, index) => {
          const isTag = item.isTag || false;

          if (isTag) {
            return (
              <li key={index} className="bp-tag">
                {item.label}
              </li>
            );
          }

          if (item.path) {
            return (
              <li key={index}>
                <AppLink to={item.path}>{item.label}</AppLink>
              </li>
            );
          }

          return (
            <li key={index}>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
