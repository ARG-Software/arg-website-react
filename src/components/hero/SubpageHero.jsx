import { useHeroAnimation } from '../../hooks/useHeroAnimations';
import { Breadcrumb } from '../navigation/Breadcrumb';

/**
 * Unified subpage hero component for all subpages (Team, Partners, Articles, Article, Clients)
 * @param {Object} props
 * @param {string|string[]} props.title - Page title (string or array for multi-line titles)
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {Array} [props.breadcrumbs] - Optional breadcrumb items: { label: string, path?: string, isTag?: boolean }
 * @param {React.ReactNode} [props.children] - Optional children for special content (e.g., stats grid for Clients page)
 * @param {string} [props.size] - Hero size: 'default' (50vh), 'large' (56vh), 'small' (42vh)
 */
export function SubpageHero({ title, subtitle, breadcrumbs, children, size = 'default' }) {
  useHeroAnimation();

  // Convert title to array if it's a string
  const titleLines = Array.isArray(title) ? title : [title];

  // Determine size class
  const sizeClass = `subpage-hero--${size}`;

  return (
    <header className={`subpage-hero ${sizeClass}`}>
      <div className="subpage-hero__inner">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}

        {/* Title */}
        <h1>
          {titleLines.map((line, index) => (
            <div key={index} className="heading_line">
              <span
                className={`subpage-hero__heading-line ${index === 1 ? 'text-color-gradiant' : ''}`}
                style={{
                  transitionDelay: `${0.15 * index}s`,
                  transform: 'translate3d(0, 150%, 0) rotateZ(4deg)',
                  textAlign: 'left',
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </h1>

        {/* Subtitle */}
        {subtitle && <p className="subpage-hero__subtitle subpage-hero__fade">{subtitle}</p>}

        {/* Children for special content (e.g., stats grid) */}
        {children}
      </div>

      {/* Divider line */}
      <div className="subpage-hero__divider" />
    </header>
  );
}
