import { ProjectItem } from '../../../components/cards/ProjectItem';

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
            {projects.map((project, i) => (
              <ProjectItem key={i} animation="slide-in-right" {...project} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
