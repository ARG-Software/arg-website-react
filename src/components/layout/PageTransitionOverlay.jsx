import { Logo } from '../icons/Logo';

const SHADE_COUNT = 32;
const SHADES = Array.from({ length: SHADE_COUNT }, (_, index) => index);

const PHASE_CLASSES = {
  idle: '',
  preparing: 'preparing',
  covering: 'covering',
  revealing: 'revealing',
};

const VARIANT_CLASSES = {
  curtain: 'pt-overlay--curtain',
  default: 'pt-overlay--default',
  'project-image': 'pt-overlay--project-image',
};

export function PageTransitionOverlay({ phase, variant, imageTransition }) {
  const isProjectImage = variant === 'project-image' && imageTransition;
  const isCurtain = variant === 'curtain';
  const isDefault = variant === 'default';
  const imageStyle = isProjectImage
    ? {
        '--pt-image-left': `${imageTransition.rect.left}px`,
        '--pt-image-top': `${imageTransition.rect.top}px`,
        '--pt-image-width': `${imageTransition.rect.width}px`,
        '--pt-image-height': `${imageTransition.rect.height}px`,
      }
    : undefined;

  const overlayClass = [
    'pt-overlay',
    PHASE_CLASSES[phase] ?? PHASE_CLASSES.idle,
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={overlayClass} aria-hidden="true">
      {isCurtain && <div className="pt-overlay__curtain" />}

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
