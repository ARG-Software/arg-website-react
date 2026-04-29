import { Navbar, Footer, arrowSvg, StatsGrid, ProjectItem, SEO } from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { useScrollAnimations, useCountUp } from '../hooks';
import { trackCTA } from '../hooks/useAnalytics';
import PROJECTS from '../data/projects.json';
import '../styles/projects.css';

export default function ProjectsPage() {
  useScrollAnimations(); // Scroll animations including footer

  useCountUp('.prp-count', { duration: 2000 });

  const STATS = [
    { value: 6, label: 'Impacted countries' },
    { value: 2000, label: 'Transactions per second' },
    { value: 1000, label: 'Deploys into production' },
    { value: 25, label: 'Years experience combined' },
  ];

  return (
    <>
      <SEO
        title="Case Studies & Projects"
        description="Explore how Arg Software delivers impactful solutions across fintech, open payments, and digital platforms. Real projects, real results."
        path="/projects/"
      />
      <div className="prp-page">
        <Navbar position="fixed" variant="dark" />

        {/* HERO */}
        <SubpageHero
          title={['They trusted us.', "It's your time now."]}
          subtitle="Real challenges. Real solutions. Explore how we've helped businesses across fintech, music tech, and digital marketing build products that last."
          size="large"
        />

        {/* STATS GRID (separated from hero as requested) */}
        <div
          className="prp-container"
          style={{ marginTop: '-3rem', position: 'relative', zIndex: 2 }}
        >
          <StatsGrid stats={STATS} />
        </div>

        {/* CASE STUDIES */}
        {PROJECTS.map((project, i) => (
          <ProjectItem
            key={i}
            imgSrc={project.img}
            mockupSrc={project.mockup}
            title={project.title}
            subtitle={project.subtitle}
            problem={project.problem}
            solutionBold={project.solutionBold}
            solution={project.solution}
            liveLink={project.link}
            logos={project.logos}
            stack={project.stack}
          />
        ))}

        {/* CTA */}
        <section className="prp-cta border-radius-bottom">
          <div className="prp-container prp-cta-inner">
            <h2 className="prp-reveal">
              Ready to elevate
              <br />
              <span>your digital experience?</span>
            </h2>
            <p className="prp-cta-sub prp-reveal prp-delay-1">
              Let's discuss your project and build something remarkable together.
            </p>
            <a
              href="https://zcal.co/argsoftware/project"
              target="_blank"
              rel="noopener noreferrer"
              className={`button-base button-contact prp-reveal prp-delay-2`}
              onClick={() => trackCTA('book_meeting', 'projects_cta')}
            >
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">Book a Meeting</div>
                <div className="button-base__button-text is-animated">Let's meet {arrowSvg}</div>
              </div>
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
