import { useState } from 'react';
import { Footer } from '@components/layout/Footer';
import { Navbar } from '@components/navigation/Navbar';
import { PageHeader } from '@components/headers/PageHeader';
import { SEO } from '@components/seo/SEO';
import { CTASection } from '@components/layout/CTASection';
import AppLink from '@components/navigation/AppLink';
import { ReportGuideDeck } from '@components/cards/ReportGuideDeck';
import { AuditLayersCard } from '@components/cards/AuditLayersCard';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { Pill, PillButton } from '@ui/pills/Pill.jsx';
import { StepProgressTimeline } from '@ui/grids/StepProgressTimeline.jsx';
import { AnimatedArrowButton } from '@ui/buttons/AnimatedArrowButton.jsx';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent, trackMailto, trackOutbound } from '@services/analytics';
import { getBrowserStoreLink, getEmailAddress, getMailtoLink } from '../services/linksService';
import { buildAuditSchemas } from '../utils/structuredData';
import PAGE from '../data/auditPage.json';
import '../styles/audit.css';

const AUDIT_SCHEMAS = buildAuditSchemas(PAGE, {
  chrome: getBrowserStoreLink('chrome'),
  firefox: getBrowserStoreLink('firefox'),
});

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
  const [flippedTier, setFlippedTier] = useState(null);
  const reportMailto = getMailtoLink('dev', PAGE.send.emailSubject);
  const [activeFeature, setActiveFeature] = useState(-1);
  const [videoTracked, setVideoTracked] = useState(false);
  const feature = PAGE.architect.features[activeFeature] ?? PAGE.architect.overview;
  // The screenshot flips to its other face for each new feature, like the price cards
  const [shot, setShot] = useState({
    front: PAGE.architect.overview,
    back: PAGE.architect.overview,
    flipped: false,
  });
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
    const next = PAGE.architect.features[index];
    setShot(current =>
      current.flipped
        ? { ...current, front: next, flipped: false }
        : { ...current, back: next, flipped: true }
    );
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

          <div data-animate-scope data-animate-default-preset="fade-up">
            <section
              id="architect"
              className="au-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global au-inner">
                <h2 className="au-title au-arch-title" data-animate-order="0">
                  {PAGE.architect.title}
                  <br />
                  <span className="text-color-gradiant">{PAGE.architect.privacy}</span>
                </h2>

                <div className="au-arch">
                  <div data-animate-order="0">
                    <p className="au-lede">{PAGE.architect.text}</p>

                    <div className="au-tabs" role="tablist" aria-label={PAGE.architect.title}>
                      {PAGE.architect.features.map((item, index) => (
                        <PillButton
                          key={item.id}
                          id={`au-tab-${item.id}`}
                          role="tab"
                          variant="dark"
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
                      <p className="au-kicker au-browsers-copy">
                        {PAGE.architect.browsersLabel} {PAGE.architect.browsersNote}{' '}
                        {PAGE.architect.changelogPrefix}
                        <AppLink
                          to={PAGE.architect.changelogPath}
                          onClick={() => trackCTA('architect_changelog', 'audit_architect')}
                        >
                          {PAGE.architect.changelogLinkLabel}
                        </AppLink>
                      </p>
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
                    <div className={shot.flipped ? 'flip-card is-flipped' : 'flip-card'}>
                      {[shot.front, shot.back].map((face, index) => {
                        const isBack = index === 1;
                        const isShown = isBack === shot.flipped;
                        return (
                          <img
                            key={isBack ? 'back' : 'front'}
                            className={
                              isBack ? 'flip-card__face flip-card__face--back' : 'flip-card__face'
                            }
                            src={face.image}
                            alt={isShown ? face.alt : ''}
                            aria-hidden={isShown ? undefined : true}
                            width="598"
                            height="896"
                          />
                        );
                      })}
                    </div>
                    <figcaption className="au-kicker">
                      {feature.caption} · {PAGE.architect.captionSuffix}
                    </figcaption>
                  </figure>
                </div>

                <SectionDivider className="au-divider" variant="light" />
              </div>
            </section>

            <section className="au-section padding-section-large background-color-white">
              <div className="container padding-global au-inner">
                <div className="au-video-block">
                  <div data-animate-order="1">
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
                    data-animate-order="0"
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
              </div>
            </section>

            <section className="au-section padding-section-large background-color-white">
              <div className="container padding-global au-inner">
                <div className="au-block-head" data-animate-order="0">
                  <h3>{PAGE.architect.checks.title}</h3>
                </div>
                <div className="au-cards au-cards--two">
                  {PAGE.architect.checks.items.map((check, index) => (
                    <BaseCard
                      key={check.title}
                      className="au-card au-card--accent"
                      variant="light"
                      padding="xl"
                      animate={true}
                      animationOrder={index + 1}
                    >
                      <span className="au-kicker au-card-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4>{check.title}</h4>
                      <p>{check.text}</p>
                    </BaseCard>
                  ))}
                </div>

                <BaseCard
                  className="au-not-tested"
                  variant="light"
                  padding="xl"
                  hover="none"
                  animate={true}
                  animationOrder={5}
                >
                  <Pill variant="outline" size="xs">
                    {PAGE.architect.notTested.label}
                  </Pill>
                  <ul>
                    {PAGE.architect.notTested.items.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="au-note">{PAGE.architect.notTested.text}</p>
                </BaseCard>
              </div>
            </section>

            <section className="au-section au-private-section padding-section-large background-color-white">
              <div className="container padding-global au-inner">
                <BaseCard
                  className="au-private"
                  variant="dark"
                  padding="xl"
                  hover="none"
                  animate={true}
                  animationOrder={0}
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
                        <path className="au-private-shackle" d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                    </span>
                    <h3>{PAGE.architect.private.title}</h3>
                  </div>
                  <ul>
                    {PAGE.architect.private.items.map((item, index) => (
                      <li key={item.label} style={{ '--au-check-index': index }}>
                        <span className="au-kicker">
                          <span className="au-private-check" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                              <path d="M6 12.5l4 4L18 8" />
                            </svg>
                          </span>
                          {item.label}
                        </span>
                        <p>{item.text}</p>
                      </li>
                    ))}
                  </ul>
                </BaseCard>

                <SectionDivider className="au-divider" variant="light" />
              </div>
            </section>

            <section
              id="read-report"
              className="au-section au-deck-section border-radius-bottom background-color-white"
            >
              <div className="container padding-global au-inner">
                <ReportGuideDeck content={PAGE.read} />
              </div>
            </section>

            <section className="au-section au-section--dark padding-section-large background-color-dark">
              <div className="container padding-global au-inner">
                <div className="au-bridge-head" data-animate-order="0">
                  <h2 className="au-title">
                    {PAGE.bridge.title}
                    <br />
                    <span className="text-color-gradiant">{PAGE.bridge.titleHighlight}</span>
                  </h2>
                  <p className="au-lede">{PAGE.bridge.text}</p>
                </div>

                <AuditLayersCard content={PAGE.bridge} />
              </div>
            </section>

            <section
              id="next-steps"
              className="au-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global au-inner">
                <div data-animate-order="0">
                  <h2 className="au-title au-send-title">
                    {PAGE.nextSteps.title}
                    <br />
                    <span className="text-color-gradiant">{PAGE.nextSteps.titleHighlight}</span>
                  </h2>
                </div>

                <div className="au-tiers">
                  {PAGE.nextSteps.tiers.map((tier, index) => {
                    const variant = tier.badge ? 'dark' : 'light';
                    const isFlipped = flippedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        id={`tier-${tier.id}`}
                        className={tier.badge ? 'au-tier au-tier--featured' : 'au-tier'}
                        data-animate-order={index + 1}
                      >
                        {/* Front: what it is. Back: what it contains. Hover, focus or tap turns it */}
                        <div
                          className={
                            isFlipped
                              ? 'au-tier-flip flip-card flip-card--hover is-flipped'
                              : 'au-tier-flip flip-card flip-card--hover'
                          }
                          tabIndex={0}
                          aria-label={`${tier.name}: ${tier.title}`}
                          onClick={() => setFlippedTier(isFlipped ? null : tier.id)}
                        >
                          <BaseCard
                            className="au-tier-face flip-card__face"
                            variant={variant}
                            padding="xl"
                            hover="none"
                          >
                            <span className="au-kicker">{tier.name}</span>
                            <p className="au-tier-price">{tier.price}</p>
                            {tier.badge && (
                              <Pill className="au-tier-badge" variant="glass">
                                {tier.badge}
                              </Pill>
                            )}
                            <h3>{tier.title}</h3>
                            <span className="au-tier-hint au-tier-hint--hover" aria-hidden="true">
                              {PAGE.nextSteps.flipHint}
                            </span>
                            <span className="au-tier-hint au-tier-hint--touch" aria-hidden="true">
                              {PAGE.nextSteps.flipHintTouch}
                            </span>
                          </BaseCard>
                          <BaseCard
                            className="au-tier-face flip-card__face flip-card__face--back"
                            variant={variant}
                            padding="xl"
                            hover="none"
                          >
                            <span className="au-kicker">{tier.name}</span>
                            <p className="au-tier-note au-tier-meta">{tier.priceMeta}</p>
                            <ul className="au-checks">
                              {tier.items.map(item => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                            {tier.limit && <p className="au-tier-note">{tier.limit}</p>}
                          </BaseCard>
                        </div>

                        <div className="au-tier-cta">
                          {tier.id === 'architect' && (
                            <AnimatedArrowButton
                              href={getBrowserStoreLink('chrome')}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="outline"
                              hoverText={tier.ctaHover}
                              onClick={() =>
                                trackOutbound(
                                  getBrowserStoreLink('chrome'),
                                  tier.cta,
                                  'audit_next_steps'
                                )
                              }
                            >
                              {tier.cta}
                            </AnimatedArrowButton>
                          )}
                          {tier.id === 'report-review' && (
                            <AnimatedArrowButton
                              href="#send-report"
                              variant="dark"
                              hoverText={tier.ctaHover}
                              onClick={() => trackCTA('report_review', 'audit_next_steps')}
                            >
                              {tier.cta}
                            </AnimatedArrowButton>
                          )}
                          {tier.id === 'architecture-review' && (
                            <AppLink
                              to="/audit/architecture-review/"
                              className="button-base button-base--dark"
                              trackEvent="cta_click"
                              trackData={{
                                cta_type: 'architecture_review',
                                cta_location: 'audit_next_steps',
                              }}
                            >
                              {tier.cta}
                            </AppLink>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <ol className="au-tier-flow" aria-hidden="true">
                  {PAGE.nextSteps.flow.map(step => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>

                <SectionDivider className="au-divider" variant="light" />
              </div>
            </section>

            <section
              id="send-report"
              className="au-section padding-section-large border-radius-bottom background-color-white"
            >
              <div className="container padding-global au-inner">
                <div className="au-send">
                  <div data-animate-order="0">
                    <h2 className="au-title au-send-title">
                      {PAGE.send.title}
                      <br />
                      <span className="text-color-gradiant">{PAGE.send.titleHighlight}</span>
                    </h2>
                    <StepProgressTimeline
                      className="au-send-timeline"
                      items={PAGE.send.steps.map(step => ({
                        id: step.title,
                        title: step.title,
                        description: step.text,
                      }))}
                      ariaLabel={PAGE.send.title}
                    />
                    <p className="au-note au-send-email">
                      {PAGE.send.emailText}{' '}
                      <a
                        href={reportMailto}
                        onClick={() => trackMailto(PAGE.send.emailSubject, 'audit_send')}
                      >
                        {getEmailAddress('dev')}
                      </a>
                      .
                    </p>
                  </div>

                  <BaseCard
                    as="aside"
                    className="au-send-card"
                    variant="light"
                    padding="xl"
                    hover="none"
                    animate={true}
                    animationOrder={1}
                  >
                    <span className="au-kicker au-checks-title">{PAGE.send.sentTitle}</span>
                    <ul className="au-checks">
                      {PAGE.send.sent.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <span className="au-kicker au-checks-title">{PAGE.send.neverTitle}</span>
                    <ul className="au-checks au-checks--never">
                      {PAGE.send.never.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="au-note au-send-note">{PAGE.send.note}</p>
                  </BaseCard>
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
              buttonLink={reportMailto}
              onPrimaryClick={() => trackMailto(PAGE.send.emailSubject, 'audit_cta')}
              secondButtonTextNotHover={PAGE.cta.secondButtonTextNotHover}
              secondButtonTextHover={PAGE.cta.secondButtonTextHover}
              secondButtonLink="/audit/architecture-review/"
              onSecondaryClick={() => trackCTA('architecture_review', 'audit_cta')}
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
