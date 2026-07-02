import { useContext } from 'react';
import AppLink from '../../../components/navigation/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { TransitionContext } from '../../../providers/TransitionProvider';
import { trackEvent } from '../../../utils/analytics';

const overviewValues = [
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

export function StudioOverviewSection({ className = '' }) {
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
      id="overview"
      className={`home-overview padding-section-xlarge background-color-white ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-stagger="120"
      data-animate-default-preset="fade-up"
    >
      <div className="home-overview__inner container padding-global">
        <div className="home-overview__grid">
          <div className="home-overview__intro">
            <h2 id="overview-heading-grid" className="home-overview__heading">
              <span className="heading_line" data-animate-order="0">
                Custom software,
              </span>
              <span className="heading_line text-color-gradiant" data-animate-order="1">
                endless potential
              </span>
            </h2>

            <p className="home-overview__lead" data-animate-order="2">
              ARG builds digital products designed to grow with your business. From early MVPs to
              systems that need to scale, we work as a long-term engineering partner, not a handoff
              vendor.
            </p>

            <a
              data-animate="fade-up"
              data-animate-order="3"
              href="#contact"
              className="home-overview__cta text-button"
              onClick={handleContactClick}
            >
              <div className="text-button_list is-dark">
                <div className="text-button_text">Build with ARG</div>
                <div className="arrow_icon-embed">{arrowSvg}</div>
              </div>
              <div className="text-button_list is-animated is-dark">
                <div className="text-button_text">Start a project</div>
                <div className="arrow_icon-embed">{arrowSvg}</div>
              </div>
            </a>

            <div className="home-overview__more" data-animate-order="4">
              <AppLink
                to="/about-us/"
                className="text-button"
                trackEvent="home_overview_about_click"
                trackData={{ source_path: '/' }}
              >
                <div className="text-button_list is-dark">
                  <div className="text-button_text">Learn more about ARG</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated is-dark">
                  <div className="text-button_text">Read the full story</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
              </AppLink>
            </div>
          </div>

          <div className="home-overview__values" aria-label="ARG engineering principles">
            {overviewValues.map((value, index) => (
              <article
                className="home-overview__value"
                key={value.title}
                data-animate-order={index + 5}
              >
                <div className="home-overview__value-title">
                  <h3>{value.title}</h3>
                  <span className="home-overview__value-line" aria-hidden="true" />
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
