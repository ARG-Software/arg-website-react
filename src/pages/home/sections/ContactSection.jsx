import { CTASection } from '../../../components/layout/CTASection';
import { trackCTA } from '../../../utils/analytics';
import { getPortfolioLink, getProjectBriefFormLink } from '../../../services/linksservice';
import HOMEPAGE from '../../../data/homepage.json';

export function ContactSection({ className = '', content = HOMEPAGE.contact }) {
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
            title={content.title}
            titleHighlight={content.titleHighlight}
            buttonTextNotHover={content.buttonTextNotHover}
            buttonTextHover={content.buttonTextHover}
            buttonLink={getPortfolioLink()}
            onPrimaryClick={() => trackCTA('portfolio', 'homepage_cta')}
            secondButtonTextNotHover={content.secondButtonTextNotHover}
            secondButtonTextHover={content.secondButtonTextHover}
            secondButtonLink={getProjectBriefFormLink()}
            onSecondaryClick={() => trackCTA('contact_brief', 'homepage_contact')}
            animate={true}
            animationStagger={120}
          />
        </div>
      </div>
    </section>
  );
}
