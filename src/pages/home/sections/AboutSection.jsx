import { arrowSvg } from '../../../components/icons/SocialIcons';
import { usePageTransition } from '../../../hooks/usePageTransition';

export function AboutSection({ className = '' }) {
  const { createHashScrollHandler } = usePageTransition();

  const handleContactClick = createHashScrollHandler('contact', {
    duration: 2.4,
    easing: progress =>
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2,
  });

  return (
    <section
      id="about"
      className={`about_wrap background-color-white padding-section-xlarge ${className}`.trim()}
    >
      <div className="about_contain container padding-global">
        <div
          data-w-id="a0f95455-6fe8-8145-bc71-63831cee596b"
          style={{ opacity: 0 }}
          className="about_list"
        >
          <h2 id="about-heading-grid" className="about_heading">
            <div className="heading_line">
              <div className="heading-style-h2">
                Custom software, <br />
                <span className="text-color-gradiant">endless potential</span>
              </div>
            </div>
          </h2>
          <div id="about-content-grid" className="about_content">
            <p className="about_paragraph">
              ARG builds digital products designed to grow alongside your business. Whether you are
              a startup finding your footing or an enterprise scaling to new heights, we act as your
              long-term partner—not just another vendor. We don't just write code; we solve business
              problems. By combining technical rigour with strategic product thinking, we ensure
              your software is ready for where you’re going, not just where you are today.
              <p>Solid Architecture, built to scale.</p>
              <p>Clean Code, maintainable and robust.</p>
              <p>True Partnership, we’re with you from the first sprint to the tenth iteration.</p>
            </p>
            <a
              href="#contact"
              className="text-button w-inline-block"
              style={{ alignSelf: 'self-start' }}
              onClick={handleContactClick}
            >
              <div className="text-button_list is-dark">
                <div className="text-button_text">Help me with my product</div>
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
