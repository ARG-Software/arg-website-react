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
import { Pill, PillButton } from '@ui/pills/Pill.jsx';
import { AnimatedArrowButton } from '@ui/buttons/AnimatedArrowButton.jsx';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent, trackOutbound } from '@services/analytics';
import { getBrowserStoreLink, getArchitectureBookingLink } from '../services/linksService';
import { buildAuditSchemas } from '../utils/structuredData';
import PAGE from '../data/auditPage.json';
import '../styles/audit.css';

const AUDIT_SCHEMAS = buildAuditSchemas(PAGE, {
  chrome: getBrowserStoreLink('chrome'),
  firefox: getBrowserStoreLink('firefox'),
});

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

function StoreButton({ store, href, variant, location }) {
  const className = `button-base button-base--${variant} au-store-btn`;
  const icon = (
    <span
      className="au-logo"
      style={{ WebkitMaskImage: `url(${store.icon})`, maskImage: `url(${store.icon})` }}
      aria-hidden="true"
    />
  );

  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOutbound(href, store.label, location)}
    >
      {icon}
      <span className="au-store-label">{store.label}</span>
    </a>
  );
}

export default function AuditPage() {
  const bookingUrl = getArchitectureBookingLink();
  const [activeFeature, setActiveFeature] = useState(-1);
  const [videoTracked, setVideoTracked] = useState(false);
  const [verificationState, setVerificationState] = useState('unverified');
  const [verificationKey, setVerificationKey] = useState(0);
  const isVerified = verificationState === 'verified';
  const feature = PAGE.architect.features[activeFeature] ?? PAGE.architect.overview;
  const video = PAGE.architect.video;

  useTimeOnPage('/audit/');
  useScrollAnimations();

  const trackVideoPlay = () => {
    if (videoTracked) return;
    setVideoTracked(true);
    trackEvent('audit_video_play', { video: video.src });
  };

  const selectFeature = index => {
    if (index === activeFeature) return;
    setActiveFeature(index);
    trackEvent('audit_feature_click', { feature: PAGE.architect.features[index].id });
  };

  return (
    <>
      <SEO
        title={PAGE.seo.title}
        description={PAGE.seo.description}
        path="/audit/"
        breadcrumbs={PAGE.hero.breadcrumbs}
        jsonLd={AUDIT_SCHEMAS}
      />
      <div className="page-wrapper au-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={PAGE.hero.title}
            subtitle={PAGE.hero.subtitle}
            breadcrumbs={PAGE.hero.breadcrumbs}
            sideItems={PAGE.hero.sideItems}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="architect"
              className="au-section padding-section-large border-radius-top border-radius-bottom background-color-white"
            >
              <div className="container padding-global au-inner">
                <div className="au-arch">
                  <div data-animate-order="0">
                    <div className="au-step">
                      <b>1</b>
                      {PAGE.architect.step}
                    </div>
                    <h2 className="au-title">{PAGE.architect.title}</h2>
                    <p className="au-subtitle">{PAGE.architect.privacy}</p>
                    <p className="au-lede">{PAGE.architect.text}</p>

                    <div className="au-tabs" role="tablist" aria-label={PAGE.architect.title}>
                      {PAGE.architect.features.map((item, index) => (
                        <PillButton
                          key={item.id}
                          id={`au-tab-${item.id}`}
                          role="tab"
                          variant={index === activeFeature ? 'dark' : 'outline'}
                          active={index === activeFeature}
                          aria-selected={index === activeFeature}
                          aria-controls={`au-panel-${item.id}`}
                          onClick={() => selectFeature(index)}
                        >
                          {item.title}
                        </PillButton>
                      ))}
                    </div>
                    <div className="au-panels">
                      {[PAGE.architect.overview, ...PAGE.architect.features].map(item => (
                        <div
                          key={item.id}
                          id={`au-panel-${item.id}`}
                          className={item === feature ? 'au-panel is-active' : 'au-panel'}
                          role="tabpanel"
                          aria-labelledby={
                            item === PAGE.architect.overview ? undefined : `au-tab-${item.id}`
                          }
                          aria-hidden={item !== feature}
                        >
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                          <ul>
                            {item.metrics.map(metric => (
                              <Pill key={metric} as="li" variant="light" size="xs">
                                {metric}
                              </Pill>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="au-stores">
                      {PAGE.architect.stores.map((store, index) => (
                        <StoreButton
                          key={store.id}
                          store={store}
                          href={getBrowserStoreLink(store.id)}
                          variant={index === 0 ? 'dark' : 'outline'}
                          location="audit_architect"
                        />
                      ))}
                    </div>

                    <div className="au-browsers">
                      <span className="au-kicker">{PAGE.architect.browsersLabel}</span>
                      <span className="au-kicker">{PAGE.architect.browsersNote}</span>
                      <ul>
                        {PAGE.architect.browsers.map(browser => (
                          <li key={browser.name} title={browser.name}>
                            <span
                              className="au-logo"
                              style={{
                                WebkitMaskImage: `url(${browser.icon})`,
                                maskImage: `url(${browser.icon})`,
                              }}
                              role="img"
                              aria-label={browser.name}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <figure className="au-shot" data-animate-order="1">
                    <img
                      key={feature.id}
                      src={feature.image}
                      alt={feature.alt}
                      width="598"
                      height="896"
                    />
                    <figcaption className="au-kicker">
                      {feature.caption} · {PAGE.architect.captionSuffix}
                    </figcaption>
                  </figure>
                </div>

                <div className="au-block au-video-block">
                  <div data-animate-order="2">
                    <h3>{video.title}</h3>
                    <p>{video.text}</p>
                    <a
                      href={video.youtubeUrl}
                      className="au-kicker au-video-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackOutbound(video.youtubeUrl, video.watchLabel, 'audit_video')
                      }
                    >
                      {video.watchLabel}
                    </a>
                  </div>
                  <video
                    className="au-video"
                    data-animate-order="3"
                    src={video.src}
                    poster={video.cover}
                    aria-label={video.label}
                    width="1920"
                    height="1080"
                    controls
                    playsInline
                    preload="none"
                    onPlay={trackVideoPlay}
                  />
                </div>

                <SectionDivider className="au-divider" variant="light" />

                <div className="au-block">
                  <div className="au-block-head" data-animate-order="4">
                    <h3>{PAGE.architect.checks.title}</h3>
                  </div>
                  <div className="au-cards au-cards--two">
                    {PAGE.architect.checks.items.map((check, index) => (
                      <BaseCard
                        key={check.title}
                        className="au-card"
                        variant="light"
                        padding="xl"
                        animate={true}
                        animationOrder={index + 5}
                      >
                        <span className="au-kicker">{String(index + 1).padStart(2, '0')}</span>
                        <h4>{check.title}</h4>
                        <p>{check.text}</p>
                      </BaseCard>
                    ))}
                  </div>
                </div>

                <BaseCard
                  className="au-block au-private"
                  variant="dark"
                  padding="xl"
                  hover="none"
                  animate={true}
                  animationOrder={11}
                >
                  <div>
                    <span className="au-private-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="4" y="11" width="16" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                    </span>
                    <h3>{PAGE.architect.private.title}</h3>
                  </div>
                  <ul>
                    {PAGE.architect.private.items.map(item => (
                      <li key={item.label}>
                        <span className="au-kicker">{item.label}</span>
                        <p>{item.text}</p>
                      </li>
                    ))}
                  </ul>
                </BaseCard>
              </div>
            </section>

            <section className="au-section au-section--dark padding-section-large background-color-dark">
              <div className="container padding-global au-inner">
                <div className="au-bridge-head" data-animate-order="0">
                  <h2 className="au-title">
                    {PAGE.bridge.title}{' '}
                    <span className="text-color-gradiant">{PAGE.bridge.titleHighlight}</span>
                  </h2>
                  <p className="au-lede">{PAGE.bridge.text}</p>
                </div>

                <BaseCard
                  className="au-layers"
                  variant="dark"
                  padding="none"
                  hover="none"
                  animate={true}
                  animationOrder={1}
                >
                  {PAGE.bridge.layers.map((layer, index) => (
                    <div key={layer.name} className="au-layer">
                      {index > 0 && (
                        <Pill className="au-layer-divider" variant="dark">
                          {PAGE.bridge.divider}
                        </Pill>
                      )}
                      <div>
                        <span className="au-kicker">{layer.kicker}</span>
                        <h3>{layer.name}</h3>
                        <p>{layer.who}</p>
                        <Pill
                          className={index === 0 ? 'au-layer-free' : undefined}
                          variant={index === 0 ? 'custom' : 'glass'}
                        >
                          {layer.tag}
                        </Pill>
                      </div>
                      <ol>
                        {layer.items.map((item, itemIndex) => (
                          <li key={item}>
                            <span className="au-kicker">
                              {String(itemIndex + 1).padStart(2, '0')}
                            </span>
                            {item}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </BaseCard>
              </div>
            </section>

            <section
              id="review"
              className="au-section padding-section-large border-radius-top border-radius-bottom background-color-white"
            >
              <div className="container padding-global au-inner">
                <div className="au-review">
                  <div data-animate-order="0">
                    <div className="au-step">
                      <b>2</b>
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
                    <AnimatedArrowButton
                      href={bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="au-price-cta"
                      hoverText={PAGE.review.price.ctaHover}
                      onClick={() => trackCTA('book_meeting', 'audit_price')}
                    >
                      {PAGE.review.price.cta}
                    </AnimatedArrowButton>
                  </BaseCard>
                </div>

                <SectionDivider className="au-divider" variant="light" />

                <div className="au-block">
                  <div className="au-block-head" data-animate-order="2">
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
                        animationOrder={index + 3}
                      >
                        <span className="au-kicker">{size.name}</span>
                        <h4>{size.title}</h4>
                        <p>{size.text}</p>
                        <span className="au-card-foot">{size.price}</span>
                      </BaseCard>
                    ))}
                  </div>
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
                      <b>3</b>
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
              title={PAGE.cta.title}
              titleHighlight={PAGE.cta.titleHighlight}
              buttonTextNotHover={PAGE.cta.buttonTextNotHover}
              buttonTextHover={PAGE.cta.buttonTextHover}
              buttonLink={bookingUrl}
              onPrimaryClick={() => trackCTA('book_meeting', 'audit_cta')}
              secondButtonTextNotHover={PAGE.cta.secondButtonTextNotHover}
              secondButtonTextHover={PAGE.cta.secondButtonTextHover}
              secondButtonLink="#architect"
              onSecondaryClick={() => trackCTA('audit_architect', 'audit_cta')}
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
