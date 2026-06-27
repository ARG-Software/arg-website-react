import { ProjectItem } from '../../../components/cards/ProjectItem';
import { ANIMATION_PRESETS } from '../../../animations/attribute-presets';
import { trackEvent, trackOutbound } from '../../../hooks/useAnalytics';

const PROJECT_GRID_PATTERN_ROWS = [1, 2, 2, 3, 4, 4];
const PROJECT_GRID_ROW_STRIDE = 7;

export function ProjectsSection({ projects, className = '' }) {
  return (
    <section
      id="cases"
      className={`projects_wrap background-color-white padding-section-xlarge border-radius-bottom ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-preset={ANIMATION_PRESETS.slideUp}
      data-animate-default-stagger="120"
    >
      <div className="projects_contain container padding-global">
        <div className="projects_heading-wrapper home-projects__heading-wrapper">
          <div className="home-projects__heading-copy">
            <h2
              className="home-section-title"
              data-animate={ANIMATION_PRESETS.fadeUp}
              data-animate-order="0"
            >
              Proof in production, not promises.
            </h2>
            <p
              className="home-projects__intro"
              data-animate={ANIMATION_PRESETS.fadeUp}
              data-animate-order="1"
            >
              This is a public selection, not the full archive. Many engagements stay private by
              design; these are the projects we can discuss within client privacy and NDA
              agreements.
            </p>
          </div>
          <div
            className="subtitle_tag-wrapper"
            data-animate={ANIMATION_PRESETS.fadeUp}
            data-animate-order="2"
          >
            <div>Use Cases</div>
          </div>
        </div>
        <div className="projects_list_wrap">
          <div role="list" className="projects_list">
            {projects.map((project, i) => {
              const patternIndex = i % PROJECT_GRID_PATTERN_ROWS.length;
              const patternCycle = Math.floor(i / PROJECT_GRID_PATTERN_ROWS.length);
              const gridRowStart =
                patternCycle * PROJECT_GRID_ROW_STRIDE + PROJECT_GRID_PATTERN_ROWS[patternIndex];

              return (
                <ProjectItem
                  key={project.slug}
                  animate={true}
                  animationPreset={ANIMATION_PRESETS.slideInRight}
                  animationOrder={i + 3}
                  {...project}
                  gridRowStart={gridRowStart}
                  onProjectClick={slug =>
                    trackEvent('project_click', {
                      project_slug: slug,
                      location: 'projects_section',
                    })
                  }
                  onProjectLinkClick={(link, title) =>
                    trackOutbound(link.href, `${title} ${link.label}`, 'project_modal')
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
