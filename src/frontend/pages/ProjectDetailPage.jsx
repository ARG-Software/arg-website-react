import { useCallback, useContext, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { UseCaseCarousel } from '@ui/grids/UseCaseCarousel.jsx';
import { ImageGallery } from '@ui/grids/ImageGallery.jsx';
import { Navbar } from '@components/navigation/Navbar';
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
  const featureImages = projectGallery.filter(image => image.featured);
  const galleryImages = projectGallery.filter(image => !image.featured);
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

  const handleCarouselSelect = useCallback(
    (index, method) =>
      trackEvent('project_carousel_select', {
        from_project: slug,
        to_project: otherProjects[index].slug,
        method,
      }),
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
        <Navbar position="fixed" variant="dark" />

        <main className="main-wrapper background-color-dark">
          {/* HERO: title over the hero image, sized to fit the first screen */}
          <section className="prp-hero">
            <div className="container padding-global prp-hero-inner">
              <h1 className="prp-hero-title" data-animate="fade-up">
                {project.title}
              </h1>
              <div className="prp-hero-image-wrap">
                <img
                  src={project.imgSrc}
                  srcSet={project.imgSrcSet}
                  sizes="100vw"
                  alt={project.title}
                  className="prp-hero-image"
                  width="1920"
                  height="1080"
                  fetchPriority="high"
                  decoding="sync"
                  data-transition-target
                />
              </div>
            </div>
          </section>

          {/* OVERVIEW: description and live links beside the project details */}
          <section className="prp-overview padding-section-large border-radius-top background-color-white">
            <div className="container container--section padding-global">
              <div className="prp-grid">
                <div className="prp-overview-text">
                  <span className="prp-section-label" data-animate="fade-up">
                    Overview
                  </span>
                  <p className="prp-overview-lead" data-animate="fade-up">
                    {project.intro}
                  </p>
                  {project.description && (
                    <p className="prp-section-text" data-animate="fade-up">
                      <InlineLinkText text={project.description} linkClassName="prp-inline-link" />
                    </p>
                  )}
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
                    <span className="prp-meta-label">Category</span>
                    <span className="prp-meta-value">{project.subtitle}</span>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up">
                    <span className="prp-meta-label">Client</span>
                    <span className="prp-meta-value">{project.client}</span>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up">
                    <span className="prp-meta-label">Services</span>
                    <div className="prp-meta-pills">
                      {project.services.map(service => (
                        <Pill
                          key={service}
                          className="prp-meta-service-tag"
                          variant="outline"
                          size="xs"
                        >
                          {service}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <div className="prp-meta-item" data-animate="fade-up">
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

          {/* FEATURE: the best gallery shots, large */}
          {featureImages.length > 0 && (
            <div className="background-color-white">
              <div className="container container--section padding-global">
                <div
                  className="prp-feature"
                  style={{ '--prp-feature-count': featureImages.length }}
                  data-animate="fade-up"
                >
                  {featureImages.map(image => (
                    <img
                      key={image.src}
                      src={image.src}
                      srcSet={image.srcSet}
                      sizes={featureImages.length > 1 ? '(max-width: 767px) 33vw, 30vw' : '100vw'}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROBLEM and APPROACH: label on the left, text on the right */}
          <section className="prp-story padding-section-large background-color-white">
            <div className="container container--section padding-global">
              <div className="prp-grid prp-row">
                <div className="prp-row-head">
                  <span className="prp-section-label" data-animate="fade-up">
                    The Problem
                  </span>
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    What had to be solved
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
              <div className="prp-grid prp-row">
                <div className="prp-row-head">
                  <span className="prp-section-label" data-animate="fade-up">
                    The Approach
                  </span>
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    How we made it work
                  </h2>
                </div>
                <ul className="prp-row-body prp-solution-list">
                  {project.solution.map((item, i) => (
                    <li key={i} data-animate="fade-up">
                      <span className="prp-solution-item-arrow arrow_icon-embed" aria-hidden="true">
                        {arrowSvg}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {galleryImages.length > 0 && (
            <div className="background-color-white">
              <div className="container container--section padding-global" data-animate="fade-up">
                <ImageGallery images={galleryImages} />
              </div>
            </div>
          )}

          {/* RESULTS: impact text, then the metric cards across the row */}
          <section
            className="prp-results padding-section-large border-radius-bottom background-color-white"
            id="results"
          >
            <div className="container container--section padding-global">
              <div className="prp-grid prp-row">
                <div className="prp-row-head">
                  <span className="prp-section-label" data-animate="fade-up">
                    Results
                  </span>
                  <h2 className="prp-section-heading" data-animate="fade-up">
                    By the numbers
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
          </section>

          <section className="prp-use-cases" id="use-cases">
            <UseCaseCarousel
              key={slug}
              items={carouselItems}
              defaultIndex={otherProjects.findIndex(p => p.slug === nextProject.slug)}
              eyebrow="Explore use cases"
              ctaText="View use case"
              ariaLabel="Use cases"
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
