import { CTASection } from '../../../components/layout/CTASection';

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
          <CTASection
            wrapInSection={false}
            includePadding={false}
            renderTitle={() => (
              <div className="heading_wrap">
                <div className="header-animation hide-tablet">
                  <h2
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
            secondButtonTextNotHover="Let's start"
            secondButtonTextHover="2 minutes"
            secondButtonLink="https://5ppw8e4ewzu.typeform.com/to/O5kXHIiC"
            secondAnalyticsEvent="typeform"
            secondAnalyticsLabel="homepage_contact"
          />
        </div>
      </div>
    </section>
  );
}
