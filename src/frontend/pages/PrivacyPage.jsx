import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { LegalArticle } from '@components/legal/LegalArticle';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA } from '@utils/analytics';
import legalPages from '@data/legalPages.json';
import { EMAIL_KEYS, getEmailAddress, getMailtoLink } from '../services/linksService';

const CONTACT_EMAIL = getEmailAddress(EMAIL_KEYS.INFO);
const PAGE = legalPages.privacyPolicy;

export default function PrivacyPage() {
  useTimeOnPage('/privacy/');
  useScrollAnimations();

  return (
    <>
      <SEO title={PAGE.title} description={PAGE.description} path={PAGE.path} />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />
        <main className="main-wrapper">
          <PageHeader
            title={PAGE.headerTitle}
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: PAGE.breadcrumbLabel }]}
            size="small"
          />
          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section className="legal-section">
              <div className="container padding-global">
                <LegalArticle page={PAGE} contactEmail={CONTACT_EMAIL} />
              </div>
            </section>
          </div>
          <div className="page-cta-wrapper">
            <CTASection
              title="Ready to build"
              titleHighlight="with us?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              buttonLink={getMailtoLink(EMAIL_KEYS.INFO, PAGE.ctaSubject)}
              animationClass="legal-animate"
              animate={true}
              onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
            />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
