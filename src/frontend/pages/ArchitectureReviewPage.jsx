import { Fragment, useState } from 'react';
import { AltchaVerification } from '@components/forms/AltchaVerification';
import { ContactForm } from '@components/forms/ContactForm';
import { Footer } from '@components/layout/Footer';
import { Navbar } from '@components/navigation/Navbar';
import { PageHeader } from '@components/headers/PageHeader';
import { SEO } from '@components/seo/SEO';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { AnimatedArrowButton } from '@ui/buttons/AnimatedArrowButton.jsx';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@services/analytics';
import { getArchitectureBookingLink } from '../services/linksService';
import PAGE from '../data/auditPage.json';
import { buildArchitectureReviewSchemas } from '../utils/structuredData';
import '../styles/audit.css';

const REVIEW_PAGE = PAGE.reviewPage;
const REVIEW_SCHEMAS = buildArchitectureReviewSchemas(PAGE);

const FORM_FIELDS = [
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Jane Rivera',
    required: true,
    layout: 'half',
  },
  {
    name: 'email',
    label: 'Work email',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'jane@company.com',
    required: true,
    layout: 'half',
  },
  {
    name: 'system',
    label: 'Product URL',
    type: 'text',
    placeholder: 'https://',
  },
  {
    name: 'journey',
    label: 'The part you want reviewed',
    type: 'textarea',
    placeholder: 'e.g. Checkout on the B2B portal, two repos, AWS',
    required: true,
  },
];

export default function ArchitectureReviewPage() {
  const bookingUrl = getArchitectureBookingLink();
  const [verificationState, setVerificationState] = useState('unverified');
  const [verificationKey, setVerificationKey] = useState(0);
  const isVerified = verificationState === 'verified';

  useTimeOnPage('/audit/architecture-review/');
  useScrollAnimations();

  return (
    <>
      <SEO
        title={REVIEW_PAGE.seo.title}
        description={REVIEW_PAGE.seo.description}
        path="/audit/architecture-review/"
        breadcrumbs={REVIEW_PAGE.hero.breadcrumbs}
        jsonLd={REVIEW_SCHEMAS}
      />
      <div className="page-wrapper au-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={REVIEW_PAGE.hero.title}
            subtitle={REVIEW_PAGE.hero.subtitle}
            breadcrumbs={REVIEW_PAGE.hero.breadcrumbs}
            sideItems={REVIEW_PAGE.hero.sideItems}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="review"
              className="au-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global au-inner">
                <div className="au-review">
                  <div data-animate-order="0">
                    <div className="au-step">
                      <b>1</b>
                      {PAGE.review.step}
                    </div>
                    <h2 className="au-title">{PAGE.review.title}</h2>
                    <p className="au-lede">{PAGE.review.text}</p>
                    {PAGE.review.lists.map(list => (
                      <Fragment key={list.title}>
                        <span className="au-kicker au-checks-title">{list.title}</span>
                        <ul className="au-checks">
                          {list.items.map(item => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </Fragment>
                    ))}
                    <p className="au-note au-not-included">
                      <strong>{PAGE.review.notIncludedLabel}</strong> {PAGE.review.notIncluded}
                    </p>
                  </div>

                  <BaseCard
                    as="aside"
                    className="au-price"
                    variant="light"
                    padding="xl"
                    hover="none"
                    animate={true}
                    animationOrder={1}
                  >
                    <span className="au-kicker">{PAGE.review.price.kicker}</span>
                    <span className="au-price-from">{PAGE.review.price.from}</span>
                    <p className="au-price-amount">{PAGE.review.price.amount}</p>
                    <p className="au-price-meta">{PAGE.review.price.meta}</p>
                    <span className="au-kicker au-scope-title">{PAGE.review.price.scopeTitle}</span>
                    <dl className="au-scope">
                      {PAGE.review.price.scope.map(item => (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="au-note au-scope-note">{PAGE.review.price.scopeNote}</p>
                    <p className="au-credit">{REVIEW_PAGE.credit}</p>
                    <AnimatedArrowButton
                      href={bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="au-price-cta"
                      hoverText={PAGE.review.price.ctaHover}
                      onClick={() => trackCTA('book_meeting', 'audit_review_price')}
                    >
                      {PAGE.review.price.cta}
                    </AnimatedArrowButton>
                  </BaseCard>
                </div>

                <SectionDivider className="au-divider" variant="light" />
              </div>
            </section>

            <section
              id="sizes"
              className="au-section padding-section-large border-radius-bottom background-color-white"
            >
              <div className="container padding-global au-inner">
                <div className="au-block-head" data-animate-order="0">
                  <h3>{PAGE.review.sizes.title}</h3>
                  <p>{PAGE.review.sizes.text}</p>
                </div>
                <div className="au-cards">
                  {PAGE.review.sizes.items.map((size, index) => (
                    <BaseCard
                      key={size.name}
                      className="au-card"
                      variant="light"
                      padding="xl"
                      animate={true}
                      animationOrder={index + 1}
                    >
                      <span className="au-kicker">{size.name}</span>
                      <h4>{size.title}</h4>
                      <p>{size.text}</p>
                      <span className="au-card-foot">{size.price}</span>
                    </BaseCard>
                  ))}
                </div>
              </div>
            </section>

            <section
              id="start"
              className="au-section au-section--dark padding-section-large background-color-dark"
            >
              <div className="container padding-global au-inner">
                <div className="au-start">
                  <div data-animate-order="0">
                    <div className="au-step">
                      <b>2</b>
                      {PAGE.start.kicker}
                    </div>
                    <h2 className="au-title">{PAGE.start.title}</h2>
                    <ol className="au-steps">
                      {PAGE.start.steps.map((step, index) => (
                        <li key={step.title}>
                          <span className="au-steps-index">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <strong>{step.title}</strong>
                            <span>{step.text}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div data-animate-order="1">
                    <ContactForm
                      title={PAGE.start.form.title}
                      description={PAGE.start.form.description}
                      fields={FORM_FIELDS}
                      submitLabel={PAGE.start.form.submitLabel}
                      submitHoverLabel={PAGE.start.form.submitHoverLabel}
                      helperText={PAGE.start.form.helperText}
                      successMessage={PAGE.start.form.successMessage}
                      subject={PAGE.start.form.subject}
                      source="audit_page"
                      formName="audit_page_fit"
                      submitDisabled={!isVerified}
                      verification={
                        <AltchaVerification
                          key={verificationKey}
                          onStateChange={setVerificationState}
                        />
                      }
                      onSubmit={() => trackEvent('audit_form_submit', { source: 'audit_page' })}
                      onSuccess={() => {
                        trackEvent('audit_form_success', { source: 'audit_page' });
                        setVerificationState('unverified');
                        setVerificationKey(key => key + 1);
                      }}
                      onError={() => {
                        trackEvent('audit_form_error', { source: 'audit_page' });
                        setVerificationState('unverified');
                        setVerificationKey(key => key + 1);
                      }}
                    />
                    <p className="au-note au-proof">{PAGE.start.proof}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper background-color-dark" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title={REVIEW_PAGE.cta.title}
              titleHighlight={REVIEW_PAGE.cta.titleHighlight}
              buttonTextNotHover={REVIEW_PAGE.cta.buttonTextNotHover}
              buttonTextHover={REVIEW_PAGE.cta.buttonTextHover}
              buttonLink={bookingUrl}
              onPrimaryClick={() => trackCTA('book_meeting', 'audit_review_cta')}
              secondButtonTextNotHover={REVIEW_PAGE.cta.secondButtonTextNotHover}
              secondButtonTextHover={REVIEW_PAGE.cta.secondButtonTextHover}
              secondButtonLink="/audit/"
              onSecondaryClick={() => trackCTA('audit_architect', 'audit_review_cta')}
              animationClass="au-animate"
              animate={true}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
