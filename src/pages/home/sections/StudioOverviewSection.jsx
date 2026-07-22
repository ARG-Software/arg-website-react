import { useContext } from 'react';
import AppLink from '../../../components/navigation/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { TransitionContext } from '../../../providers/TransitionProvider';
import { trackEvent } from '../../../utils/analytics';

import HOMEPAGE from '../../../data/homepage.json';

export function StudioOverviewSection({ className = '', content = HOMEPAGE.overview }) {
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
                {content.title[0]}
              </span>
              <span className="heading_line text-color-gradiant" data-animate-order="1">
                {content.title[1]}
              </span>
            </h2>

            <p className="home-overview__lead" data-animate-order="2">
              {content.lead}
            </p>

            <a
              data-animate="fade-up"
              data-animate-order="3"
              href="#contact"
              className="home-overview__cta text-button"
              onClick={handleContactClick}
            >
              <div className="text-button_list is-dark">
                <div className="text-button_text">{content.cta.label}</div>
                <div className="arrow_icon-embed">{arrowSvg}</div>
              </div>
              <div className="text-button_list is-animated is-dark">
                <div className="text-button_text">{content.cta.hoverLabel}</div>
                <div className="arrow_icon-embed">{arrowSvg}</div>
              </div>
            </a>
          </div>

          <div className="home-overview__values" aria-label="ARG engineering principles">
            {content.values.map((value, index) => (
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

            <div className="home-overview__more" data-animate-order={content.values.length + 5}>
              <AppLink
                to="/about-us/"
                className="text-button"
                trackEvent="home_overview_about_click"
                trackData={{ source_path: '/' }}
              >
                <div className="text-button_list is-dark">
                  <div className="text-button_text">{content.aboutCta.label}</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated is-dark">
                  <div className="text-button_text">{content.aboutCta.hoverLabel}</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
              </AppLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
