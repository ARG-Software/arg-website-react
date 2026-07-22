import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA } from '@utils/analytics';
import { getProjectBriefFormLink } from '../services/linksservice';
import { Navbar } from '@components/navigation/Navbar';
import { BaseCard } from '@components/cards/BaseCard';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@components/layout/SectionDivider';
import { SectionTicker } from '@components/layout/SectionTicker';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { TechStackConsole } from '@components/widgets/TechStackConsole';
import { StepProgressTimeline } from '@components/grids/StepProgressTimeline';
import WORKING_WITH_US from '../data/workingWithUs.json';
import '../styles/careers.css';
import '../styles/step-progress-timeline.css';

const CONVERSATION_STEP_INTERVAL_MS = 6000;

export default function WorkingWithUsPage() {
  useTimeOnPage('/working-with-us/');
  useScrollAnimations();

  return (
    <>
      <SEO
        title={WORKING_WITH_US.seo.title}
        description={WORKING_WITH_US.seo.description}
        path="/working-with-us/"
      />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={WORKING_WITH_US.hero.title}
            subtitle={WORKING_WITH_US.hero.subtitle}
            breadcrumbs={WORKING_WITH_US.hero.breadcrumbs}
            sideItems={WORKING_WITH_US.hero.sideItems}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="why-us"
              className="cp-whyus-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global cp-whyus-inner">
                <header className="cp-whyus-header" data-animate-order="0">
                  <div>
                    <h2 className="cp-whyus-title">
                      {WORKING_WITH_US.whyUs.title.beforeStrike}{' '}
                      <span className="cp-whyus-strike">{WORKING_WITH_US.whyUs.title.strike}</span>{' '}
                      {WORKING_WITH_US.whyUs.title.middle}{' '}
                      <span>{WORKING_WITH_US.whyUs.title.highlight}</span>
                    </h2>
                  </div>
                  <aside className="cp-whyus-side">
                    <p>{WORKING_WITH_US.whyUs.aside.text}</p>
                    <span>{WORKING_WITH_US.whyUs.aside.label}</span>
                  </aside>
                </header>

                <div className="cp-whyus-pillars">
                  {WORKING_WITH_US.whyUs.pillars.map((pillar, index) => (
                    <article
                      key={pillar.index}
                      className="cp-whyus-pillar"
                      data-animate-order={index + 1}
                    >
                      <span className="cp-whyus-pillar-index">{pillar.index}</span>
                      <div className="cp-whyus-kpi">
                        {pillar.metricValue > 0 ? (
                          <span data-animate="width-countup">
                            <span
                              fs-numbercount-element="number"
                              fs-numbercount-start="0"
                              fs-numbercount-end={pillar.metricValue}
                            >
                              0
                            </span>
                            {pillar.metricSuffix}
                          </span>
                        ) : (
                          <span>0{pillar.metricSuffix}</span>
                        )}
                        <small>{pillar.unit}</small>
                      </div>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.description}</p>
                    </article>
                  ))}
                </div>

                <div className="cp-tech-intro" data-animate-order="4">
                  <div>
                    <h3>{WORKING_WITH_US.whyUs.techStackIntro.title}</h3>
                    <p>{WORKING_WITH_US.whyUs.techStackIntro.text}</p>
                  </div>
                </div>

                <TechStackConsole
                  className="cp-whyus-console"
                  data={WORKING_WITH_US.whyUs.techStackConsole}
                  animate={true}
                  animationOrder={5}
                />
              </div>
              <div className="padding-bottom padding-80-40"></div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="values"
              className="cp-values-section padding-section-large background-color-white"
            >
              <div className="container padding-global cp-values-inner">
                <div className="cp-section-header" data-animate-order="0">
                  <h2 className="cp-section-title">
                    <span className="cp-line">{WORKING_WITH_US.values.title}</span>
                  </h2>
                  <p className="cp-section-subtitle">{WORKING_WITH_US.values.subtitle}</p>
                </div>
                <div className="cp-values-grid">
                  {WORKING_WITH_US.values.items.map((value, index) => (
                    <BaseCard
                      key={value.title}
                      className="cp-value-card"
                      variant="light"
                      padding="lg"
                      animate={true}
                      animationOrder={index + 1}
                    >
                      <span className="cp-value-number">{String(index + 1).padStart(2, '0')}</span>
                      <h3 className="cp-value-title">{value.title}</h3>
                      <p className="cp-value-desc">{value.description}</p>
                      <div className="cp-value-anti">
                        <strong>NOT</strong> {value.antiValue}
                      </div>
                    </BaseCard>
                  ))}
                </div>
              </div>
              <div className="padding-bottom padding-80-40"></div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="fit-check"
              className="cp-fit-section padding-section-large border-radius-bottom background-color-white"
            >
              <div className="container padding-global cp-fit-inner">
                <div className="cp-fit-header" data-animate-order="0">
                  <div>
                    <h2>
                      {WORKING_WITH_US.fitCheck.title}{' '}
                      <span>{WORKING_WITH_US.fitCheck.titleHighlight}</span>
                    </h2>
                    <p>{WORKING_WITH_US.fitCheck.intro}</p>
                  </div>
                </div>

                <div className="cp-fit-panel" data-animate-order="1">
                  <section className="cp-fit-block" aria-label="Where ARG fits">
                    <SectionTicker
                      label={WORKING_WITH_US.fitCheck.fitTicker}
                      className="cp-fit-ticker"
                    />
                    <div className="cp-fit-columns">
                      {WORKING_WITH_US.fitCheck.checks.map(item => (
                        <article key={item.title} className="cp-fit-column">
                          <div className="cp-fit-column-title">
                            <span className="cp-fit-accent" aria-hidden="true" />
                            <h4>{item.title}</h4>
                          </div>
                          <p>{item.description}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section
                    className="cp-fit-block cp-fit-block--process"
                    aria-label={WORKING_WITH_US.fitCheck.processAriaLabel}
                  >
                    <SectionTicker
                      label={WORKING_WITH_US.fitCheck.processTicker}
                      className="cp-fit-ticker"
                    />
                    <StepProgressTimeline
                      className="cp-fit-timeline"
                      items={WORKING_WITH_US.fitCheck.conversationSteps.map(step => ({
                        id: step.title,
                        title: step.title,
                        description: step.description,
                      }))}
                      intervalMs={CONVERSATION_STEP_INTERVAL_MS}
                      ariaLabel={WORKING_WITH_US.fitCheck.processAriaLabel}
                    />
                  </section>
                </div>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper background-color-dark" id="contact">
            <CTASection
              title={WORKING_WITH_US.cta.title}
              titleHighlight={WORKING_WITH_US.cta.titleHighlight}
              buttonTextNotHover={WORKING_WITH_US.cta.buttonTextNotHover}
              buttonTextHover={WORKING_WITH_US.cta.buttonTextHover}
              animationClass="cp-animate"
              animate={true}
              buttonLink={getProjectBriefFormLink()}
              onPrimaryClick={() => trackCTA('working_with_us_brief', 'working_with_us_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
