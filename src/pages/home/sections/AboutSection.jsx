import { useContext } from 'react';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { TransitionContext } from '../../../providers/TransitionProvider';
import { trackEvent } from '../../../hooks/useAnalytics';

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
      className={`about_wrap background-color-white padding-section-xlarge ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-stagger="120"
      data-animate-default-preset="fade-up"
    >
      <div className="about_contain container padding-global">
        <div className="about_list">
          <h2 id="about-heading-grid" className="about_heading">
            <div className="heading_line" data-animate-order="0">
              <div className="heading-style-h2">
                Custom software, <br />
                <span className="text-color-gradiant">endless potential</span>
              </div>
            </div>
          </h2>
          <div id="about-content-grid" className="about_content">
            <div className="about_paragraph">
              <p data-animate-order="2">
                ARG builds digital products designed to grow with your business. From early MVPs to
                systems that need to scale, we work as a long-term engineering partner, not a
                handoff vendor. We combine technical rigour with product thinking so your software
                is ready for where you are going, not just where you are today.
              </p>
              <p className="about_point" data-animate-order="3">
                Solid architecture, built to scale.
              </p>
              <p className="about_point" data-animate-order="4">
                Clean code, maintainable by design.
              </p>
              <p className="about_point" data-animate-order="5">
                True partnership, from first sprint to future iterations.
              </p>
            </div>
            <a
              data-animate="fade-up"
              data-animate-order="6"
              href="#contact"
              className="text-button w-inline-block"
              style={{ alignSelf: 'self-start' }}
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
        </div>
      </div>
    </section>
  );
}
