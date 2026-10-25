import { Logo } from '../icons/Logo';

const SHADE_COUNT = 32;
const SHADES = Array.from({ length: SHADE_COUNT }, (_, index) => index);
// Matches the `.prp-hero-image` aspect ratio so the overlay lands exactly on the hero.
const HERO_ASPECT_RATIO = 9 / 16;

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
  const sourceImage = imageTransition?.source;
  const targetImage = imageTransition?.target;
  // Mount only while visible so the grow animation starts on the first visible frame.
  const isProjectImage = variant === 'project-image' && sourceImage && phase !== 'idle';
  const isCurtain = variant === 'curtain';
  const isDefault = variant === 'default';

  let imageStyle;
  if (isProjectImage) {
    // clientWidth excludes the scrollbar, like the hero's `width: 100%`.
    const targetWidth = document.documentElement.clientWidth;
    imageStyle = {
      '--pt-image-left': `${sourceImage.rect.left}px`,
      '--pt-image-top': `${sourceImage.rect.top}px`,
      '--pt-image-width': `${sourceImage.rect.width}px`,
      '--pt-image-height': `${sourceImage.rect.height}px`,
      '--pt-target-width': `${targetWidth}px`,
      '--pt-target-height': `${targetWidth * HERO_ASPECT_RATIO}px`,
    };
  }

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

      {isProjectImage && <div className="pt-overlay__backdrop" />}

      {isProjectImage && (
        <div className="pt-project-image" style={imageStyle}>
          <img
            src={sourceImage.src}
            srcSet={sourceImage.srcSet}
            sizes={sourceImage.sizes}
            alt=""
            decoding="async"
          />
          {targetImage && (
            <img
              src={targetImage.src}
              srcSet={targetImage.srcSet}
              sizes={targetImage.sizes}
              alt=""
              className="pt-project-image__target"
              decoding="async"
            />
          )}
        </div>
      )}

      {isDefault && (
        <div className="pt-overlay__brand">
          <Logo className="pt-overlay__logo" />
        </div>
      )}
    </div>
  );
}
