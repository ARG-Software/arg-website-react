import { useContext } from 'react';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { TransitionContext } from '../../../providers/TransitionProvider';
import { trackEvent } from '../../../hooks/useAnalytics';

const aboutValues = [
  {
    title: 'Solid architecture',
    description: 'Built to scale - structural decisions that hold as load and complexity grow.',
  },
  {
    title: 'Clean code',
    description: 'Maintainable by design, so the next change is never the expensive one.',
  },
  {
    title: 'True partnership',
    description:
      'From first sprint to future iterations - accountable in production, not a handoff.',
  },
];

export function AboutSection({ className = '' }) {
  const { scrollToHash } = useContext(TransitionContext);

  const handleContactClick = event => {
    event.preventDefault();
    trackEvent('section_navigation', {
      section: 'contact',
      source_path: `${window.location.pathname}${window.location.search}`,
      target_path: '/',
    });
    scrollToHash('contact', {
      duration: 2.4,
      easing: progress =>
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2,
    });
  };

  return (
    <section
      id="about"
      className={`home-about padding-section-xlarge background-color-white ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-stagger="120"
      data-animate-default-preset="fade-up"
    >
      <div className="home-about__inner container padding-global">
        <div className="home-about__grid">
          <div className="home-about__intro">
            <h2 id="about-heading-grid" className="home-about__heading">
              <span className="heading_line" data-animate-order="0">
                Custom software,
              </span>
              <span className="heading_line text-color-gradiant" data-animate-order="1">
                endless potential
              </span>
            </h2>

            <p className="home-about__lead" data-animate-order="2">
              ARG builds digital products designed to grow with your business. From early MVPs to
              systems that need to scale, we work as a long-term engineering partner, not a handoff
              vendor.
            </p>

            <a
              data-animate="fade-up"
              data-animate-order="3"
              href="#contact"
              className="home-about__cta text-button w-inline-block"
              onClick={handleContactClick}
            >
              <div className="text-button_list is-dark">
                <div className="text-button_text">Build with ARG</div>
                <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
              </div>
              <div className="text-button_list is-animated is-dark">
                <div className="text-button_text">Start a project</div>
                <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
              </div>
            </a>
          </div>

          <div className="home-about__values" aria-label="ARG engineering values">
            {aboutValues.map((value, index) => (
              <article
                className="home-about__value"
                key={value.title}
                data-animate-order={index + 4}
              >
                <div className="home-about__value-title">
                  <h3>{value.title}</h3>
                  <span className="home-about__value-line" aria-hidden="true" />
                </div>
                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
