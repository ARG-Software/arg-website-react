import { useRef } from 'react';
import { TextArrowButton } from '@ui/buttons/TextArrowButton.jsx';
import AppLink from '../navigation/AppLink';
import { isMobile } from '../../utils/helpers';

export function ProjectItem({
  slug,
  imgSrc,
  imgSrcSet,
  thumbnailSrc,
  thumbnailSrcSet,
  title,
  subtitle,
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
  mobileAnimationPreset,
  mobileAnimationOrder,
  gridRowStart,
  onProjectClick,
}) {
  const coverImageRef = useRef(null);
  const coverSrc = thumbnailSrc || imgSrc;
  const isMobileViewport = typeof window !== 'undefined' && isMobile();
  const effectivePreset = isMobileViewport
    ? (mobileAnimationPreset ?? animationPreset)
    : animationPreset;
  const effectiveOrder = isMobileViewport
    ? (mobileAnimationOrder ?? animationOrder)
    : animationOrder;
  const coverSrcSet = thumbnailSrcSet || imgSrcSet;
  const getProjectImageTransition = () => {
    if (typeof window !== 'undefined' && isMobile()) return undefined;

    const image = coverImageRef.current;
    if (!image) return undefined;

    const rect = image.getBoundingClientRect();
    return {
      transition: 'project-image',
      sourceImage: {
        src: coverSrc,
        srcSet: coverSrcSet,
        sizes: '100vw',
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      },
      targetImage: {
        src: imgSrc,
        srcSet: imgSrcSet,
        sizes: '100vw',
      },
    };
  };

  const animationAttrs = animate
    ? {
        'data-animate': effectivePreset,
        ...(effectiveOrder !== undefined ? { 'data-animate-order': String(effectiveOrder) } : {}),
      }
    : {};

  return (
    <div
      role="listitem"
      className="projects_item_wrap"
      style={
        Number.isInteger(gridRowStart)
          ? { '--project-grid-row-start': String(gridRowStart) }
          : undefined
      }
      {...animationAttrs}
    >
      <div className="projects_item">
        {/* Grey placeholder while the cover image loads */}
        <div className="projects_item_display" />
        <div className="projects_item_cover-img">
          <AppLink
            to={`/projects/${slug}/`}
            aria-label={`View ${title} case study`}
            className="projects_item_cover-link"
            onClick={() => onProjectClick?.(slug)}
            getTransitionOptions={getProjectImageTransition}
          >
            <img
              ref={coverImageRef}
              draggable={false}
              loading="lazy"
              decoding="async"
              alt={`${title} ${subtitle} case study`}
              src={coverSrc}
              sizes="(max-width: 767px) 91vw, (max-width: 991px) 88vw, 24vw"
              srcSet={coverSrcSet}
              className="projects_visual_img is-thumbnail"
              width="1200"
              height="800"
            />
          </AppLink>
        </div>
      </div>
      <div className="projects_item_description">
        <TextArrowButton
          as={AppLink}
          to={`/projects/${slug}/`}
          aria-label={title}
          className="project-title-link"
          label={title}
          hoverLabel="View the case study"
          dark
          labelAs="h3"
          labelClassName="heading-style-h3"
          arrowClassName="large"
          onClick={() => onProjectClick?.(slug)}
          getTransitionOptions={getProjectImageTransition}
        />
        <div className="subtitle-projects">{subtitle}</div>
      </div>
    </div>
  );
}
