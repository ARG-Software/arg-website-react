import React from 'react';
import { arrowSvg } from '../icons/SocialIcons';
import { trackOutbound } from '../../hooks/useAnalytics';
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
  logos,
  stack,
  animation = 'fade-up',
}) {
  return (
    <div
      id="project-item-wrapper-grid"
      role="listitem"
      className="projects_item_wrap w-dyn-item"
      data-animate={animation}
    >
      <div className="projects_item" data-animate={animation}>
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
          <a
            href={liveLink}
            className="test_item_link"
            onClick={() => trackOutbound(liveLink, title, 'project_modal')}
          >
            View Live Site
          </a>
          <div className="padding-bottom padding-42"></div>
          <div className="projects_item_visual is-showcase" data-mockup-src={mockupSrc}></div>
        </div>
        <div className="projects_item_content is-padding-bottom is-white-bg">
          <div className="projects_item_tag">
            <div className="test_tag_text">Solution</div>
          </div>
          <div className="padding-bottom padding-30"></div>
          <p className="test_item_paragraph text-align-center is-bold">{solutionBold}</p>
          <p className="test_item_paragraph text-align-center">{solution}</p>
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
          <img
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
        </div>
      </div>
      <div className="projects_item_description">
        <AppLink to={`/projects/${slug}`} aria-label={title} className="text-button w-inline-block">
          <div className="text-button_list is-dark">
            <h3 className="heading-style-h3">{title}</h3>
            <div className="arrow_icon-embed large w-embed">{arrowSvg}</div>
          </div>
          <div className="text-button_list is-animated is-dark">
            <h3 className="heading-style-h3">{title}</h3>
            <div className="arrow_icon-embed large w-embed">{arrowSvg}</div>
          </div>
        </AppLink>
        <div className="subtitle-projects">{subtitle}</div>
      </div>
    </div>
  );
}
