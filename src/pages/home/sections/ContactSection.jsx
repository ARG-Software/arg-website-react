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
              data-animate="slide-up"
              className="heading-style-h1 form-header"
              data-animate-order="0"
            >
              You want real results?
            </h2>
            <div className="padding-bottom padding-48"></div>
          </div>
          <div className="padding-bottom padding-48"></div>
          <a
            data-animate="fade"
            data-animate-order="1"
            href="https://5ppw8e4ewzu.typeform.com/to/O5kXHIiC"
            target="_blank"
            rel="noopener noreferrer"
            className="button-base button-contact w-inline-block"
            onClick={() => trackCTA('typeform', 'homepage_contact')}
          >
            <div className="button-base_text_wrap">
              <div className="button-base__button-text">Let's start</div>
              <div className="button-base__button-text is-animated">2 minutes</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export function ContactSection({ className = '' }) {
  return (
    <section
      id="contact"
      className={`section_cta padding-section-medium ${className}`.trim()}
      data-animate-scope
      data-animate-default-stagger="80"
    >
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
                    data-animate="slide-up"
                    className="heading-style-h1 hide-mobile-portrait"
                    data-animate-order="2"
                  >
                    Built for scale
                  </h2>
                </div>
                <div className="header-animation show-tablet">
                  <h2
                    data-animate="slide-up"
                    className="heading-style-h1 hide-mobile-portrait"
                    data-animate-order="3"
                  >
                    Explore
                  </h2>
                </div>
                <div className="header-animation hide-tablet">
                  <h2 data-animate="slide-up" className="heading-style-h1" data-animate-order="4">
                    <span className="text-color-gradiant-2">
                      Shipped to production. Across industries.
                    </span>
                  </h2>
                </div>
                <div className="header-animation show-mobile-portrait">
                  <h2
                    data-animate="slide-up"
                    className="heading-style-h1 show-tablet"
                    data-animate-order="5"
                  >
                    Explore
                  </h2>
                </div>
                <div className="header-animation show-tablet">
                  <h2 className="heading-style-h1 text-color-gradiant">
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
