import { useCallback, useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { UseCaseCarousel } from '@ui/grids/UseCaseCarousel.jsx';
import { ImageGallery } from '@ui/grids/ImageGallery.jsx';
import { Navbar } from '@components/navigation/Navbar';
import { PageHeader } from '@components/headers/PageHeader';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { Pill } from '@ui/pills/Pill.jsx';
import { SEO } from '@components/seo/SEO';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { InlineLinkText } from '@components/widgets/InlineLinkText';
import { ShuffleText } from '@components/widgets/ShuffleText';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@services/analytics';
import { TransitionContext } from '@providers/TransitionProvider';
import { isMobile } from '@utils/helpers';
import { buildProjectSchema } from '@utils/structuredData';
import { getProjectGallery } from '@constants/projectGallery';
import { getProjectBriefFormLink } from '@services/linksService';
import PROJECTS from '../data/projects.json';
import '../styles/projects.css';

const PAGE_TOPICS = [
  { label: 'Overview', href: '#overview' },
  { label: 'The Problem', href: '#problem' },
  { label: 'The Approach', href: '#approach' },
  { label: 'Results', href: '#results' },
  { label: 'Use Cases', href: '#use-cases' },
];

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { go } = useContext(TransitionContext);
  useScrollAnimations();

  const projectIndex = PROJECTS.findIndex(p => p.slug === slug);
  const project = PROJECTS[projectIndex];
  const nextProject = PROJECTS[(projectIndex + 1) % PROJECTS.length];
  const otherProjects = useMemo(() => PROJECTS.filter(p => p.slug !== slug), [slug]);
  const carouselItems = useMemo(
    () =>
      otherProjects.map(p => ({
        key: p.slug,
        title: p.title,
        credit: p.subtitle,
        meta: [p.client],
        image: p.imgSrc,
        srcSet: p.imgSrcSet,
        thumb: p.thumbnailSrc,
        thumbSrcSet: p.thumbnailSrcSet,
      })),
    [otherProjects]
  );
  const projectGallery = useMemo(
    () => getProjectGallery(project?.slug, project?.title),
    [project?.slug, project?.title]
  );
  const stackItems = project?.stack.split(',').map(s => s.trim()) ?? [];
  const seoDescription = (project?.intro || project?.challenge || '')
    .replace(/\n+/g, ' ')
    .slice(0, 160)
    .trim();
  const projectLinks = useMemo(() => {
    if (!project) return [];

    if (Array.isArray(project.links) && project.links.length > 0) {
      return project.links.filter(link => link.href);
    }

    if (!project.liveLink) return [];

    return [
      {
        href: project.liveLink,
        label: project.liveLinkLabel ?? 'View Live Site',
        trackType: 'view_live',
      },
    ];
  }, [project]);

  useTimeOnPage(`/projects/${slug}/`);

  useEffect(() => {
    if (!project) {
      navigate(`/projects/${PROJECTS[0].slug}/`, { replace: true });
    }
  }, [project, navigate]);

  // Hover is not tracked: sweeping the mouse along the row would send an event per thumbnail
  const handleCarouselSelect = useCallback(
    (index, method) => {
      if (method === 'hover') return;
      trackEvent('project_carousel_select', {
        from_project: slug,
        to_project: otherProjects[index].slug,
        method,
      });
    },
    [slug, otherProjects]
  );

  // Opening plays the same image handoff as the homepage project cards
  const handleCarouselOpen = useCallback(
    (index, image) => {
      const target = otherProjects[index];
      trackEvent('project_carousel_open', { from_project: slug, to_project: target.slug });

      const rect = image?.getBoundingClientRect();
      if (!rect || isMobile()) {
        go(`/projects/${target.slug}`, { scrollMode: 'top' });
        return;
      }

      go(`/projects/${target.slug}`, {
        scrollMode: 'top',
        transition: 'project-image',
        sourceImage: {
          src: target.imgSrc,
          srcSet: target.imgSrcSet,
          sizes: '100vw',
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        },
      });
    },
    [slug, otherProjects, go]
  );

  if (!project) {
    return null;
  }

  return (
    <>
      <Helmet>
        <link
          rel="preload"
          as="image"
          href={nextProject.imgSrc}
          imageSrcSet={nextProject.imgSrcSet}
          imageSizes="100vw"
        />
      </Helmet>
      <SEO
        title={`${project.title} - Use Case`}
        description={seoDescription}
        path={`/projects/${slug}/`}
        image={project.imgSrc}
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: project.title, path: `/projects/${slug}/` },
        ]}
        jsonLd={buildProjectSchema(project)}
      />
      <div className="page-wrapper prp-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          {/* HERO: the shared sub page header, with the project image in place of the drawing */}
          <PageHeader
            title={[project.title, project.subtitle]}
            subtitle={project.intro}
            breadcrumbs={[
              { label: 'Home', path: '/' },
              { label: 'Use Cases', path: '/#cases' },
              { label: project.title },
            ]}
            sideItems={PAGE_TOPICS}
            size="small"
            aside={
              <img
                src={project.imgSrc}
                srcSet={project.imgSrcSet}
                sizes="(max-width: 63.9375rem) 100vw, max(52vw, 89rem)"
                alt={project.title}
                width="1920"
                height="1080"
                fetchPriority="high"
                decoding="sync"
                data-transition-target
              />
            }
          />

          {/* OVERVIEW: description and live links beside the project details */}
          <section
            id="overview"
            className="prp-overview padding-section-xlarge border-radius-top background-color-white"
          >
            <div className="container container--section padding-global">
              <div className="prp-grid">
                <div className="prp-overview-text">
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    Overview
                  </h2>
                  {project.description?.split('\n\n').map(paragraph => (
                    <p key={paragraph} className="prp-section-text" data-animate="fade-up">
                      <InlineLinkText text={paragraph} linkClassName="prp-inline-link" />
                    </p>
                  ))}
                  {projectLinks.length > 0 && (
                    <div className="prp-overview-links" data-animate="fade-up">
                      {projectLinks.map(link => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="prp-live-link"
                          onClick={() => trackCTA(link.trackType ?? 'view_live', `project_${slug}`)}
                        >
                          <span>{link.label}</span>
                          <span className="arrow_icon-embed" aria-hidden="true">
                            {arrowSvg}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="prp-meta-list">
                  <div className="prp-meta-item" data-animate="fade-up">
                    <span className="prp-meta-label">Client</span>
                    <span className="prp-meta-value">{project.client}</span>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up">
                    <span className="prp-meta-label">Engagement</span>
                    <span className="prp-meta-value">{project.timeline}</span>
                  </div>
                  <div className="prp-meta-item prp-meta-item--wide" data-animate="fade-up">
                    <span className="prp-meta-label">Services</span>
                    <div className="prp-meta-pills">
                      {project.services.map(service => (
                        <Pill key={service} variant="dark" size="xs">
                          {service}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <div className="prp-meta-item prp-meta-item--wide" data-animate="fade-up">
                    <span className="prp-meta-label">Technology</span>
                    <div className="prp-meta-pills">
                      {stackItems.map(tech => (
                        <Pill
                          key={tech}
                          className="prp-stack-tag"
                          data-animate-hover="lift"
                          variant="light"
                          size="sm"
                        >
                          {tech}
                        </Pill>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURE: the project hero as a thin band across the full width */}
          <div className="background-color-white">
            <div className="prp-feature" data-animate="fade-up">
              <img
                src={project.imgSrc}
                srcSet={project.imgSrcSet}
                sizes="100vw"
                alt=""
                width="1920"
                height="1080"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* PROBLEM and APPROACH: label on the left, text on the right */}
          <section id="problem" className="prp-story padding-section-large background-color-white">
            <div className="container container--section padding-global">
              <div className="prp-grid prp-row">
                <div className="prp-row-head">
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    The Problem
                    <br />
                    <span className="text-color-gradiant">what had to be solved</span>
                  </h2>
                </div>
                <div className="prp-row-body">
                  {project.challenge.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="prp-section-text" data-animate="fade-up">
                      <InlineLinkText text={paragraph} linkClassName="prp-inline-link" />
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <SectionDivider
              variant="default"
              hideOnMobile={false}
              data-animate="divider-expander-show"
            />
          </section>

          <section id="approach" className="prp-story padding-section-large background-color-white">
            <div className="container container--section padding-global">
              <div className="prp-grid prp-row">
                <div className="prp-row-head">
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    The Approach
                    <br />
                    <span className="text-color-gradiant">how we made it work</span>
                  </h2>
                  {project.mockupSrc && (
                    <img
                      className="prp-approach-mockup"
                      src={project.mockupSrc}
                      srcSet={project.mockupSrcSet}
                      sizes="(max-width: 47.9375rem) 50vw, 17rem"
                      alt={`${project.title} mockup`}
                      loading="lazy"
                      decoding="async"
                      data-animate="fade-up"
                    />
                  )}
                </div>
                <ul className="prp-row-body prp-solution-list">
                  {project.solution.map((item, i) => (
                    <li key={i} data-animate="fade-up">
                      <span className="prp-solution-arrow" aria-hidden="true">
                        {arrowSvg}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <SectionDivider
              variant="default"
              hideOnMobile={false}
              data-animate="divider-expander-show"
            />
          </section>

          {projectGallery.length > 0 && (
            <section className="padding-section-large background-color-white">
              <div className="container container--section padding-global">
                <div data-animate="fade-up">
                  <ImageGallery images={projectGallery} />
                </div>
              </div>
              <SectionDivider
                variant="default"
                hideOnMobile={false}
                data-animate="divider-expander-show"
              />
            </section>
          )}

          {/* RESULTS: impact text, then the metric cards across the row */}
          <section
            className="prp-results padding-section-large background-color-white"
            id="results"
          >
            <div className="container container--section padding-global">
              <div className="prp-grid prp-row">
                <div className="prp-row-head">
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    Results
                    <br />
                    <span className="text-color-gradiant">by the numbers</span>
                  </h2>
                </div>
                <div className="prp-row-body">
                  <p className="prp-section-text" data-animate="fade-up">
                    <InlineLinkText text={project.impact} linkClassName="prp-inline-link" />
                  </p>
                </div>
                <div className="prp-results-cards">
                  {project.metrics.map((metric, i) => (
                    <BaseCard
                      key={i}
                      className="prp-metric-card"
                      variant="dark"
                      padding="sm"
                      radius="sm"
                      hover="none"
                      animate={true}
                    >
                      <div className="prp-metric-card-number" data-animate="width-countup">
                        {metric.displayValue ? (
                          <span className="prp-metric-number">{metric.displayValue}</span>
                        ) : (
                          <>
                            <span
                              className="prp-metric-number"
                              fs-numbercount-element="number"
                              fs-numbercount-start="0"
                              fs-numbercount-end={metric.value}
                            >
                              0
                            </span>
                            {metric.suffix ?? (parseFloat(metric.value) % 1 !== 0 ? '' : '+')}
                          </>
                        )}
                      </div>
                      <p className="prp-metric-card-label">
                        <span className="prp-metric-bullet"></span>
                        <span className="prp-metric-label-text">
                          <ShuffleText
                            text={metric.label}
                            tag="span"
                            style={{
                              whiteSpace: 'normal',
                              display: 'inline',
                              overflowWrap: 'anywhere',
                            }}
                          />
                        </span>
                      </p>
                    </BaseCard>
                  ))}
                </div>
              </div>
            </div>
            <SectionDivider
              variant="default"
              hideOnMobile={false}
              data-animate="divider-expander-show"
            />
          </section>

          {/* USE CASES: last white section, rounded into the dark contact block */}
          <section
            className="prp-use-cases border-radius-bottom background-color-white"
            id="use-cases"
          >
            <UseCaseCarousel
              key={slug}
              items={carouselItems}
              defaultIndex={otherProjects.findIndex(p => p.slug === nextProject.slug)}
              eyebrow="Explore other use cases"
              ctaText="View"
              ariaLabel="Other use cases"
              onSelect={handleCarouselSelect}
              onOpen={handleCarouselOpen}
            />
          </section>

          <section className="page-cta-wrapper background-color-dark" id="contact">
            <CTASection
              title="Facing a similar"
              titleHighlight="challenge?"
              mobileTitleHighlight="challenge?"
              buttonTextNotHover="Start a project"
              buttonTextHover="Tell us about it"
              animationClass="cp-animate"
              animate={true}
              buttonLink={getProjectBriefFormLink()}
              onPrimaryClick={() => trackCTA('project_brief', `project_${slug}_cta`)}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
