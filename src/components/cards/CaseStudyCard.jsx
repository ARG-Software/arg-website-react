import React from 'react';
import { arrowSvg } from '../icons/SocialIcons';
import { TechStack } from '../tags/TechStack';
import { trackOutbound } from '../../hooks/useAnalytics';

export function CaseStudyCard({ project, index: _index }) {
  return (
    <section className="cp-case">
      <div className="cp-container">
        <div className="cp-case-header cp-reveal">
          <div>
            <div className="cp-case-idx">{project.idx}</div>
            <h2 className="cp-case-title">{project.title}</h2>
            <div className="cp-case-industry">{project.subtitle}</div>
          </div>
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="cp-visit-link"
            onClick={() => trackOutbound(project.link, project.title, 'case_study')}
          >
            Visit Live Site {arrowSvg}
          </a>
        </div>

        <img
          src={project.img}
          alt={project.title}
          className="cp-case-hero-img cp-reveal"
          loading="lazy"
        />

        <div className="cp-case-grid">
          <div className="cp-reveal">
            <div className="cp-label">The Challenge</div>
            <p className="cp-case-text">{project.problem}</p>
          </div>
          <div className="cp-reveal cp-delay-1">
            <div className="cp-label">Our Solution</div>
            <p className="cp-case-bold">{project.solutionBold}</p>
            <p className="cp-case-text">{project.solution}</p>
          </div>
        </div>

        <div className="cp-mockup-area cp-reveal">
          <img
            src={project.mockup}
            alt={`${project.title} mockup`}
            className="cp-mockup-img"
            loading="lazy"
          />
        </div>

        <div className="cp-tech-stack-desktop">
          <TechStack stack={project.stack} />
        </div>

        <div className="cp-logos cp-reveal">
          {project.logos.map((logo, j) => (
            <button key={j} className="cp-logo-item" type="button" aria-label={logo.name}>
              <img src={logo.src} alt={logo.name} loading="lazy" />
              <span className="cp-logo-tooltip">{logo.name}</span>
            </button>
          ))}
        </div>

        {project.testimonial && (
          <div className="cp-testimonial cp-reveal">
            <p className="cp-testimonial-quote">{project.testimonial.quote}</p>
            <div className="cp-testimonial-author">
              <strong>{project.testimonial.author}</strong> — {project.testimonial.role}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
