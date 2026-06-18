import { Logo } from '../icons/Logo';

const SHADE_COUNT = 32;
const SHADES = Array.from({ length: SHADE_COUNT }, (_, index) => index);

export function PageTransitionOverlay({ phase, variant, imageTransition }) {
  const isProjectImage = variant === 'project-image' && imageTransition;
  const isDefault = variant === 'default';
  const imageStyle = isProjectImage
    ? {
        '--pt-image-left': `${imageTransition.rect.left}px`,
        '--pt-image-top': `${imageTransition.rect.top}px`,
        '--pt-image-width': `${imageTransition.rect.width}px`,
        '--pt-image-height': `${imageTransition.rect.height}px`,
      }
    : undefined;

  return (
    <div className={`pt-overlay ${phase} pt-overlay--${variant}`} aria-hidden="true">
      {isDefault && (
        <div className="pt-overlay__shades">
          {SHADES.map(index => (
            <span key={index} style={{ '--pt-shade-index': index }} />
          ))}
        </div>
      )}

      {isProjectImage && (
        <img
          src={imageTransition.src}
          srcSet={imageTransition.srcSet}
          sizes={imageTransition.sizes}
          alt=""
          className="pt-project-image"
          style={imageStyle}
          decoding="async"
          fetchPriority="high"
        />
      )}

      {isDefault && (
        <div className="pt-overlay__brand">
          <Logo className="pt-overlay__logo" />
        </div>
      )}
    </div>
  );
}
