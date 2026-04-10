import React from 'react';
import { arrowSvg } from '../icons/SocialIcons';
import { TechStack } from '../tags/TechStack';
import { trackOutbound } from '../../hooks/useAnalytics';

export function CaseStudyCard({ project, index: _index }) {
  return (
    <section className="prp-case">
      <div className="prp-container">
        <div className="prp-case-header prp-reveal">
          <div>
            <div className="prp-case-idx">{project.idx}</div>
            <h2 className="prp-case-title">{project.title}</h2>
            <div className="prp-case-industry">{project.subtitle}</div>
          </div>
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="prp-visit-link"
            onClick={() => trackOutbound(project.link, project.title, 'case_study')}
          >
            Visit Live Site {arrowSvg}
          </a>
        </div>

        <img
          src={project.img}
          alt={project.title}
          className="prp-case-hero-img prp-reveal"
          loading="lazy"
        />

        <div className="prp-case-grid">
          <div className="prp-reveal">
            <div className="prp-label">The Challenge</div>
            <p className="prp-case-text">{project.problem}</p>
          </div>
          <div className="prp-reveal prp-delay-1">
            <div className="prp-label">Our Solution</div>
            <p className="prp-case-bold">{project.solutionBold}</p>
            <p className="prp-case-text">{project.solution}</p>
          </div>
        </div>

        <div className="prp-mockup-area prp-reveal">
          <img
            src={project.mockup}
            alt={`${project.title} mockup`}
            className="prp-mockup-img"
            loading="lazy"
          />
        </div>

        <div className="prp-tech-stack-desktop">
          <TechStack stack={project.stack} />
        </div>

        <div className="prp-logos prp-reveal">
          {project.logos.map((logo, j) => (
            <button key={j} className="prp-logo-item" type="button" aria-label={logo.name}>
              <img src={logo.src} alt={logo.name} loading="lazy" />
              <span className="prp-logo-tooltip">{logo.name}</span>
            </button>
          ))}
        </div>

        {project.testimonial && (
          <div className="prp-testimonial prp-reveal">
            <p className="prp-testimonial-quote">{project.testimonial.quote}</p>
            <div className="prp-testimonial-author">
              <strong>{project.testimonial.author}</strong> — {project.testimonial.role}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
