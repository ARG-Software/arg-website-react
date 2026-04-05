import { CTASection } from '../../../components/layout/CTASection';
import { trackCTA } from '../../../hooks/useAnalytics';

function CTAVideo() {
  return (
    <div className="typeform-wrapper-o5kxhiic">
      <div
        data-autoplay="true"
        data-loop="true"
        data-wf-ignore="true"
        className="background-video-2 formtext w-background-video w-background-video-atom"
      >
        <video
          className="lazy-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          data-wf-ignore="true"
          data-object-fit="cover"
        >
          <source src="videos/cta-video-opt.mp4" data-wf-ignore="true" />
        </video>
        <div className="formtext form-click">
          <div className="header-animation form">
            <h2
              data-w-id="4449cd61-6b68-de73-f730-a1b2266f5192"
              className="heading-style-h1 form-header"
              style={{
                transform:
                  'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
              }}
            >
              You want real results?
            </h2>
            <div className="padding-bottom padding-48"></div>
          </div>
          <div className="padding-bottom padding-48"></div>
          <a
            data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f42"
            style={{ opacity: 0 }}
            href="https://5ppw8e4ewzu.typeform.com/to/O5kXHIiC"
            target="_blank"
            rel="noopener noreferrer"
            className="button-base button-contact w-inline-block"
            onClick={() => trackCTA('typeform', 'homepage_contact')}
          >
            <div className="button-base_text_wrap">
              <div
                data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f44"
                className="button-base__button-text"
              >
                Let's start
              </div>
              <div
                data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f46"
                className="button-base__button-text is-animated"
              >
                2 minutes
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export function ContactSection({ className = '' }) {
  return (
    <section id="contact" className={`section_cta padding-section-medium ${className}`.trim()}>
      <div className="padding-global is--cta-mobile">
        <div className="container-large">
          {/* Video CTA - Now first */}
          <CTAVideo />
          <div className="padding-bottom padding-80-40"></div>

          {/* Portfolio CTA - Now second */}
          <CTASection
            wrapInSection={false}
            includePadding={false}
            renderTitle={() => (
              <div className="heading_wrap">
                <div className="header-animation hide-tablet">
                  <h2
                    data-w-id="56016045-6d3b-3314-c750-b8757587bc0f"
                    style={{
                      transform:
                        'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                    }}
                    className="heading-style-h1 hide-mobile-portrait"
                  >
                    Built for scale
                  </h2>
                </div>
                <div className="header-animation show-tablet">
                  <h2
                    data-w-id="61119dee-a65e-a624-b8fe-664d48050e05"
                    style={{
                      transform:
                        'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                    }}
                    className="heading-style-h1 hide-mobile-portrait"
                  >
                    Explore
                  </h2>
                </div>
                <div className="header-animation hide-tablet">
                  <h2
                    data-w-id="965ad8ce-d1ff-77b6-6ae7-091aab3a6bad"
                    style={{
                      transform:
                        'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                    }}
                    className="heading-style-h1"
                  >
                    <span className="text-color-gradiant-2">
                      Shipped to production. Across industries.
                    </span>
                  </h2>
                </div>
                <div className="header-animation show-mobile-portrait">
                  <h2
                    data-w-id="56016045-6d3b-3314-c750-b8757587bc15"
                    style={{
                      transform:
                        'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                    }}
                    className="heading-style-h1 show-tablet"
                  >
                    Explore
                  </h2>
                </div>
                <div className="header-animation show-tablet">
                  <h2
                    data-w-id="56016045-6d3b-3314-c750-b8757587bc1e"
                    className="heading-style-h1 text-color-gradiant"
                  >
                    <span className="text-color-gradiant-2">what we've shipped.</span>
                  </h2>
                </div>
              </div>
            )}
            buttonTextNotHover="Show me more"
            buttonTextHover="View Portfolio"
            buttonLink="/files/portfolio.pdf"
            analyticsEvent="portfolio"
            analyticsLabel="homepage_cta"
          />
        </div>
      </div>
    </section>
  );
}
