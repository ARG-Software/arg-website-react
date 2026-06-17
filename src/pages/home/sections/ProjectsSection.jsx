import { ProjectItem } from '../../../components/cards/ProjectItem';
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
      data-animate-default-preset="slide-up"
    >
      <div className="projects_contain container padding-global">
        <div className="projects_heading-wrapper" data-animate-stagger="200">
          <h2
            className="projects_heading heading-style-h2"
            data-animate="fade"
            data-animate-order="0"
          >
            They trusted us. It's your time now.
          </h2>
          <div className="subtitle_tag-wrapper" data-animate="fade" data-animate-order="1">
            <div>Use Cases</div>
          </div>
        </div>
        <div className="projects_list_wrap w-dyn-list">
          <div role="list" className="projects_list w-dyn-items">
            {projects.map((project, i) => {
              const patternIndex = i % PROJECT_GRID_PATTERN_ROWS.length;
              const patternCycle = Math.floor(i / PROJECT_GRID_PATTERN_ROWS.length);
              const gridRowStart =
                patternCycle * PROJECT_GRID_ROW_STRIDE + PROJECT_GRID_PATTERN_ROWS[patternIndex];

              return (
                <ProjectItem
                  key={project.slug}
                  animation="slide-in-right"
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
