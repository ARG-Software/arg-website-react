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
            title="Ready to scale?"
            titleHighlight="We're listening"
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
