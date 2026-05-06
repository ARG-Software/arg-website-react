import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navbar, SEO, SectionDivider, arrowSvg } from '../components';
import { ShuffleText } from '../components/widgets/ShuffleText';
import { useScrollAnimations, useCinematicZoomBlur, useNextProjectSection } from '../hooks';
import { animateCountUp, getCountUpEnd } from '../hooks/useCountUp';
import { trackCTA } from '../hooks/useAnalytics';
import PROJECTS from '../data/projects.json';
import '../styles/projects.css';

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const nextSectionRef = useRef(null);
  const progressRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);
  useScrollAnimations();

  const projectIndex = PROJECTS.findIndex(p => p.slug === slug);
  const project = PROJECTS[projectIndex];
  const nextProject = PROJECTS[(projectIndex + 1) % PROJECTS.length];
  const stackItems = project?.stack.split(',').map(s => s.trim()) ?? [];

  useEffect(() => {
    if (!project) {
      navigate(`/projects/${PROJECTS[0].slug}`, { replace: true });
    }
  }, [project, navigate]);

  useCinematicZoomBlur(canvasRef, fallbackRef, project?.imgSrc);
  useNextProjectSection(nextSectionRef, progressRef, nextProject.slug);

  // Count-up observer for metric numbers
  useEffect(() => {
    const numbers = document.querySelectorAll('.prp-metric-number');
    if (!numbers.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const end = getCountUpEnd(el);
            if (end !== null) {
              animateCountUp(el, end, 2000);
            }
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    numbers.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [slug]);

  if (!project) {
    return null;
  }

  return (
    <>
      <Helmet>
        <link rel="preload" as="image" href={nextProject.imgSrc} />
      </Helmet>
      <SEO
        title={`${project.title} - Case Study`}
        description={project.challenge.slice(0, 160)}
        path={`/projects/${slug}`}
      />
      <div className="prp-page">
        <Navbar position="fixed" variant="dark" />

        {/* HERO */}
        <section className="prp-hero">
          <div className="prp-hero-image-wrap">
            <canvas ref={canvasRef} className="prp-hero-canvas" />
            <img
              ref={fallbackRef}
              src={project.imgSrc}
              srcSet={project.imgSrcSet}
              sizes="100vw"
              alt={project.title}
              className="prp-hero-image-fallback"
              width="1920"
              height="1080"
            />
          </div>
        </section>

        {/* INTRO — white card */}
        <section className="prp-intro padding-section-large">
          <div className="prp-grid-container">
            <div className="prp-intro-grid">
              <div className="prp-intro-sidebar">
                <h1 className="prp-intro-title" data-animate="title-reveal">
                  {project.title}
                </h1>
                {project.liveLink && (
                  <a
                    href={project.liveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="prp-intro-live-link"
                    data-animate="fade-up"
                    data-animate-delay="100"
                    onClick={() => trackCTA('view_live', `project_${slug}`)}
                  >
                    <span>View Live Site</span>
                    {arrowSvg}
                  </a>
                )}
                <div className="prp-meta-list" data-animate-scope data-animate-stagger="80">
                  <div className="prp-meta-item" data-animate="fade-up" data-animate-order="0">
                    <span className="prp-meta-label">Category</span>
                    <span className="prp-meta-value">{project.subtitle}</span>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up" data-animate-order="1">
                    <span className="prp-meta-label">Client</span>
                    <span className="prp-meta-value">{project.client}</span>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up" data-animate-order="2">
                    <span className="prp-meta-label">Services</span>
                    <div className="prp-meta-services">
                      {project.services.map((service, i) => (
                        <span
                          key={i}
                          className="prp-meta-service-tag"
                          data-animate="tag-pop"
                          data-animate-order={i}
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up" data-animate-order="3">
                    <span className="prp-meta-label">Technology</span>
                    <div className="prp-meta-services">
                      {stackItems.map((tech, i) => (
                        <span
                          key={i}
                          className="prp-stack-tag prp-stack-tag--inline"
                          data-animate="tag-pop"
                          data-animate-order={i + 4}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="prp-intro-content">
                <h3 className="prp-intro-subtitle" data-animate="fade-up">
                  {project.intro}
                </h3>
                <hr className="prp-intro-divider" data-animate="divider-expander-show" />
                <p
                  className="prp-intro-description"
                  data-animate="fade-up"
                  data-animate-delay="200"
                >
                  {project.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionDivider variant="default" />

        {/* CHALLENGE — white */}
        <section className="prp-challenge padding-section-large">
          <div className="prp-grid-container">
            <div className="prp-challenge-grid">
              <div
                className="prp-challenge-image"
                data-animate="gsap-scale"
                data-animate-from="1.15"
                data-animate-to="1"
              >
                <img
                  src={project.mockupSrc}
                  srcSet={project.mockupSrcSet}
                  alt={`${project.title} mockup`}
                  loading="lazy"
                  data-animate="fade-up"
                  width="800"
                  height="600"
                />
              </div>
              <div className="prp-challenge-content">
                <span className="prp-section-label" data-animate="slide-from-left">
                  The Challenge
                </span>
                <h2 className="prp-section-heading" data-animate="slide-up">
                  What we set out to solve
                </h2>
                {project.challenge.split('\n\n').map((paragraph, i) => (
                  <p
                    key={i}
                    className="prp-section-text"
                    data-animate="fade-up"
                    data-animate-delay={i * 150}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionDivider variant="default" />

        {/* SOLUTION — white card */}
        <section className="prp-solution padding-section-large">
          <div className="prp-grid-container">
            <div className="prp-solution-grid">
              <div className="prp-solution-content">
                <span className="prp-solution-label" data-animate="slide-from-left">
                  Our Solution
                </span>
                <h2 className="prp-solution-heading" data-animate="slide-up">
                  How we approached it
                </h2>
                <ul className="prp-solution-list" data-animate-scope data-animate-stagger="100">
                  {project.solution.map((item, i) => (
                    <li key={i} data-animate="solution-item" data-animate-order={i}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="prp-solution-image"
                data-animate="gsap-scale"
                data-animate-from="1.12"
                data-animate-to="1"
              >
                <img
                  src={project.imgSrc}
                  srcSet={project.imgSrcSet}
                  sizes="(max-width: 767px) 100vw, 50vw"
                  alt={project.title}
                  loading="lazy"
                  data-animate="fade-up"
                  width="1200"
                  height="675"
                />
              </div>
            </div>
          </div>
        </section>

        <SectionDivider variant="default" />

        {/* RESULTS — merged metrics + impact */}
        <section className="prp-results padding-section-large" id="results">
          <div className="prp-grid-container">
            <div className="prp-results-grid">
              <div className="prp-results-left">
                <span className="prp-section-label" data-animate="slide-from-left">
                  Results
                </span>
                <h2 className="prp-results-heading" data-animate="slide-up">
                  By the numbers
                </h2>
                <p className="prp-results-text" data-animate="fade-up">
                  {project.impact}
                </p>
              </div>
              <div className="prp-results-right">
                <div className="prp-results-cards" data-animate-scope data-animate-stagger="150">
                  {project.metrics.map((metric, i) => (
                    <div
                      key={i}
                      className="prp-metric-card"
                      data-animate="fade-up"
                      data-animate-order={i}
                    >
                      <div className="prp-metric-card-number">
                        <span
                          className="prp-metric-number"
                          fs-numbercount-element="number"
                          fs-numbercount-start="0"
                          fs-numbercount-end={metric.value}
                        >
                          0
                        </span>
                        {parseFloat(metric.value) % 1 !== 0 ? '' : '+'}
                      </div>
                      <p className="prp-metric-card-label">
                        <span className="prp-metric-bullet"></span>
                        <ShuffleText text={metric.label} tag="span" />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEXT PROJECT — full viewport pinned */}
        <section
          className="prp-next-section padding-section-large"
          id="next-project"
          ref={nextSectionRef}
        >
          <div className="prp-next-bg">
            <img src={nextProject.imgSrc} alt={nextProject.title} className="prp-next-bg-img" />
          </div>
          <div className="prp-next-content">
            <span className="prp-next-eyebrow">Next project</span>
            <div className="prp-next-hint">
              <span>Keep Scrolling for next project</span>
              <div className="prp-next-hint-arrow prp-next-hint-arrow--down">{arrowSvg}</div>
            </div>
          </div>
        </section>

        <div className="prp-scroll-progress" ref={progressRef}>
          <div className="prp-scroll-progress-bar" />
        </div>
      </div>
    </>
  );
}
