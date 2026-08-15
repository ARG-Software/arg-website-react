import AppLink from './AppLink';
import { Breadcrumb as UiBreadcrumb } from '@ui/navigation/Breadcrumb.jsx';

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
  return (
    <UiBreadcrumb
      items={items}
      renderLink={({ item, children, className }) => (
        <AppLink to={item.path} className={className} transition="curtain">
          {children}
        </AppLink>
      )}
      animate={animate}
      animationTrigger={animationTrigger}
      animationOrder={animationOrder}
    />
  );
}
