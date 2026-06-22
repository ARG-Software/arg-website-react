import { useRef } from 'react';
import { arrowSvg } from '../icons/SocialIcons';
import AppLink from '../navigation/AppLink';

export function ProjectItem({
  slug,
  imgSrc,
  mockupSrc,
  imgSrcSet,
  title,
  subtitle,
  problem,
  solutionBold,
  solution,
  liveLink,
  liveLinkLabel = 'View Live Site',
  links,
  logos,
  stack,
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
  gridRowStart,
  onProjectClick,
  onProjectLinkClick,
}) {
  const coverImageRef = useRef(null);
  const solutionText = Array.isArray(solution) ? solution[0] : solution;
  const projectLinks =
    Array.isArray(links) && links.length > 0
      ? links.filter(link => link.href)
      : liveLink
        ? [{ href: liveLink, label: liveLinkLabel }]
        : [];

  const getProjectImageTransition = () => {
    const image = coverImageRef.current;
    if (!image) return undefined;

    const rect = image.getBoundingClientRect();
    return {
      transition: 'project-image',
      sourceImage: {
        src: imgSrc,
        srcSet: imgSrcSet,
        sizes: '100vw',
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      },
    };
  };

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      id="project-item-wrapper-grid"
      role="listitem"
      className="projects_item_wrap w-dyn-item"
      style={
        Number.isInteger(gridRowStart)
          ? { '--project-grid-row-start': String(gridRowStart) }
          : undefined
      }
      {...animationAttrs}
    >
      <div className="projects_item">
        <div className="projects_item_display">
          <div
            className="projects_item_visual"
            data-modal-img={imgSrc}
            data-modal-img-set={imgSrcSet}
          ></div>
        </div>
        <div className="projects_item_content">
          <div className="projects_item_tag">
            <div className="test_tag_text">Problem</div>
          </div>
          <div className="padding-bottom padding-30"></div>
          <p className="test_item_paragraph text-align-center">{problem}</p>
          <div className="padding-bottom padding-42"></div>
          {projectLinks.length > 0 && (
            <div className="project-item-links">
              {projectLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="test_item_link"
                  onClick={() => onProjectLinkClick?.(link, title)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <div className="padding-bottom padding-42"></div>
          <div className="projects_item_visual is-showcase" data-mockup-src={mockupSrc}></div>
        </div>
        <div className="projects_item_content is-padding-bottom is-white-bg">
          <div className="projects_item_tag">
            <div className="test_tag_text">Solution</div>
          </div>
          <div className="padding-bottom padding-30"></div>
          <p className="test_item_paragraph text-align-center is-bold">{solutionBold}</p>
          <p className="test_item_paragraph text-align-center">{solutionText}</p>
          <div className="padding-bottom padding-30"></div>
          <div className="projects_item_logo-wrap w-dyn-list">
            <div role="list" className="projects_item_list w-dyn-items">
              {logos?.map((logo, i) => (
                <button
                  key={i}
                  role="listitem"
                  className="projects_list_logo w-dyn-item"
                  type="button"
                  aria-label={logo.name}
                >
                  <img
                    loading="lazy"
                    src={logo.src}
                    alt={logo.name}
                    className="projects_logo_image"
                    width="80"
                    height="40"
                  />
                  <span className="projects_logo_tooltip">{logo.name}</span>
                </button>
              ))}
            </div>
            <p className="projects_logo-hint">Tap a logo to check the stack name</p>
          </div>
          <div className="padding-bottom padding-42"></div>
          <div className="projects_item_stack">
            <div className="projects_stack_text is-medium">Tech Stack:</div>
            <div className="projects_stack_text">{stack}</div>
          </div>
        </div>
        <div className="projects_item_cover-img">
          <AppLink
            to={`/projects/${slug}`}
            aria-label={`View ${title} case study`}
            className="projects_item_cover-link"
            onClick={() => onProjectClick?.(slug)}
            getTransitionOptions={getProjectImageTransition}
          >
            <img
              ref={coverImageRef}
              data-wf-drag="false"
              loading="lazy"
              fetchPriority="auto"
              decoding="async"
              alt=""
              src={imgSrc}
              sizes="(max-width: 767px) 91vw, (max-width: 991px) 88vw, 24vw"
              srcSet={imgSrcSet}
              className="projects_visual_img is-thumbnail"
              width="1200"
              height="800"
            />
          </AppLink>
        </div>
      </div>
      <div className="projects_item_description">
        <AppLink
          to={`/projects/${slug}`}
          aria-label={title}
          className="text-button project-title-link w-inline-block"
          onClick={() => onProjectClick?.(slug)}
          getTransitionOptions={getProjectImageTransition}
        >
          <div className="text-button_list is-dark">
            <h3 className="heading-style-h3">{title}</h3>
            <div className="arrow_icon-embed large w-embed">{arrowSvg}</div>
          </div>
          <div className="text-button_list is-animated is-dark">
            <h3 className="heading-style-h3">I want to know more</h3>
            <div className="arrow_icon-embed large w-embed">{arrowSvg}</div>
          </div>
        </AppLink>
        <div className="subtitle-projects">{subtitle}</div>
      </div>
    </div>
  );
}
