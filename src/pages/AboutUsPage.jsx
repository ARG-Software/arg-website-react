import { useState } from 'react';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA, trackEvent } from '../utils/analytics';
import { getProjectBriefFormLink } from '../services/linksservice';
import {
  Navbar,
  BaseCard,
  Footer,
  CTASection,
  SectionDivider,
  SEO,
  PageHeader,
  Pill,
  StepProgressTimeline,
} from '../components';
import ABOUT_DATA from '../data/about.json';
import '../styles/about.css';
import '../styles/step-progress-timeline.css';

const STORY_STEP_INTERVAL_MS = 6500;

function getStoryDetailTone(label) {
  const normalizedLabel = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalizedLabel.includes('jose')) return 'jose';
  if (normalizedLabel.includes('rui')) return 'rui';
  if (normalizedLabel.includes('together') || normalizedLabel.includes('arg')) return 'together';
  return 'default';
}

function StoryDetail({ detail }) {
  return (
    <div className={`about-strand about-strand--${getStoryDetailTone(detail.label)}`}>
      <span className="about-strand__who">{detail.label}</span>
      <span className="about-strand__txt">{detail.text}</span>
    </div>
  );
}

export default function AboutUsPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = ABOUT_DATA.timeline.steps[activeStepIndex] ?? ABOUT_DATA.timeline.steps[0];

  useTimeOnPage('/about-us/');
  useScrollAnimations();

  const handleStoryStepChange = (item, index) => {
    setActiveStepIndex(index);
    trackEvent('about_story_step_activate', { step_id: item.id });
  };

  return (
    <>
      <SEO
        title={ABOUT_DATA.seo.title}
        description={ABOUT_DATA.seo.description}
        path="/about-us/"
      />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={ABOUT_DATA.hero.title}
            subtitle={ABOUT_DATA.hero.subtitle}
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'About Us' }]}
            sideItems={[
              { label: 'Origin', href: '#origin' },
              { label: 'The Story', href: '#story' },
              { label: 'Founders', href: '#founders' },
              { label: 'Company', href: '#company' },
              { label: 'Beliefs', href: '#beliefs' },
              { label: 'Collaborators', href: '#collaborators' },
            ]}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="origin"
              className="about-origin-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global about-origin-inner">
                <h2 className="about-lead" data-animate-order="0">
                  {ABOUT_DATA.origin.title}
                </h2>
                <div className="about-origin-paras" data-animate-order="1">
                  {ABOUT_DATA.origin.paragraphs.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="padding-bottom padding-80-40"></div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="story"
              className="about-story-section padding-section-large background-color-white"
            >
              <div className="container padding-global about-story-inner">
                <header className="about-story-head" data-animate-order="0">
                  <h2 className="about-section-title">{ABOUT_DATA.timeline.title}</h2>
                  <p className="about-section-intro">{ABOUT_DATA.timeline.intro}</p>
                </header>

                <div
                  className="about-story-timeline"
                  data-animate-order="1"
                  style={{ '--step-count': ABOUT_DATA.timeline.steps.length }}
                >
                  <StepProgressTimeline
                    items={ABOUT_DATA.timeline.steps.map(step => ({
                      id: step.id,
                      title: step.title,
                      description: step.description,
                    }))}
                    intervalMs={STORY_STEP_INTERVAL_MS}
                    ariaLabel="ARG story timeline"
                    className="about-story-bar"
                    onActiveChange={handleStoryStepChange}
                  />
                </div>

                <div className="about-story-panel" data-animate-order="2" key={activeStep.id}>
                  <div className="about-story-panel__year">
                    <div className="about-story-panel__year-value">{activeStep.title}</div>
                    <div className="about-story-panel__year-label">{activeStep.label}</div>
                  </div>
                  <div className="about-story-panel__detail">
                    <h3 className="about-story-panel__headline">{activeStep.headline}</h3>
                    <div className="about-story-panel__strands">
                      {activeStep.details.map(detail => (
                        <StoryDetail key={`${activeStep.id}-${detail.label}`} detail={detail} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="padding-bottom padding-80-40"></div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="founders"
              className="about-founders-section padding-section-large background-color-white"
            >
              <div className="container padding-global about-founders-inner">
                <header className="about-founders-head" data-animate-order="0">
                  <h2 className="about-section-title">{ABOUT_DATA.founders.title}</h2>
                  <p className="about-section-intro">{ABOUT_DATA.founders.intro}</p>
                </header>

                <div className="about-founder-grid">
                  {ABOUT_DATA.founders.people.map((founder, index) => (
                    <BaseCard
                      key={founder.id}
                      className="about-founder-card"
                      variant="light"
                      padding="xl"
                      animate={true}
                      animationOrder={index + 1}
                    >
                      <div className="about-founder-card__head">
                        <div className="about-founder-monogram" aria-hidden="true">
                          <span>{founder.initials}</span>
                        </div>
                        <div>
                          <h3>{founder.name}</h3>
                          <span className="about-founder-card__role">{founder.role}</span>
                        </div>
                      </div>
                      <p className="about-founder-card__bio">{founder.bio}</p>
                      <div className="about-founder-card__focus">
                        <span className="about-founder-card__focus-label">Focus</span>
                        <span className="about-founder-card__focus-value">{founder.focus}</span>
                      </div>
                      <div className="about-founder-card__tags">
                        {founder.tags.map(tag => (
                          <Pill key={tag} variant="outline" size="sm">
                            {tag}
                          </Pill>
                        ))}
                      </div>
                    </BaseCard>
                  ))}
                </div>
              </div>
            </section>

            <section
              id="company"
              className="about-company-section padding-section-large background-color-dark"
            >
              <div className="container padding-global about-company-inner">
                <div className="about-company-grid">
                  <div className="about-company-left" data-animate-order="0">
                    <h2 className="about-company-title">{ABOUT_DATA.company.title}</h2>
                    <div className="about-company-copy">
                      {ABOUT_DATA.company.paragraphs.map(paragraph => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                  <div className="about-company-right" data-animate-order="1">
                    {ABOUT_DATA.company.points.map(point => (
                      <article key={point.title} className="about-company-point">
                        <h3>{point.title}</h3>
                        <p>{point.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section
              id="beliefs"
              className="about-why-section padding-section-large background-color-white"
            >
              <div className="container padding-global about-why-inner">
                <header className="about-why-head" data-animate-order="0">
                  <h2 className="about-section-title">{ABOUT_DATA.beliefs.title}</h2>
                  <p className="about-section-intro">{ABOUT_DATA.beliefs.intro}</p>
                </header>

                <div className="about-principle-grid">
                  {ABOUT_DATA.beliefs.principles.map((principle, index) => (
                    <BaseCard
                      key={principle.title}
                      className="about-principle"
                      variant="light"
                      padding="xl"
                      animate={true}
                      animationOrder={index + 1}
                    >
                      <span className="about-principle__num">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3>{principle.title}</h3>
                      <p>{principle.description}</p>
                    </BaseCard>
                  ))}
                </div>
              </div>
              <div className="padding-bottom padding-80-40"></div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="collaborators"
              className="about-collaborators-section padding-section-large border-radius-bottom background-color-white"
            >
              <div className="container padding-global about-collaborators-inner">
                <div className="about-collaborators-grid">
                  <div className="about-collaborators-left" data-animate-order="0">
                    <h2 className="about-section-title">{ABOUT_DATA.collaborators.title}</h2>
                    {ABOUT_DATA.collaborators.paragraphs.map(paragraph => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="about-collaborators-right" data-animate-order="1">
                    <h3 className="about-disc-title">Disciplines we assemble</h3>
                    <div className="about-disc-chips">
                      {ABOUT_DATA.collaborators.disciplines.map(discipline => (
                        <span
                          key={discipline}
                          className={`about-disc-chip ${discipline === 'AI' ? 'about-disc-chip--ai' : ''}`.trim()}
                        >
                          {discipline}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper background-color-dark" id="contact">
            <CTASection
              title="Quality over"
              titleHighlight="headcount."
              mobileTitleHighlight="headcount."
              buttonTextNotHover="Send us a message"
              buttonTextHover="Let's talk"
              animationClass="cp-animate"
              animate={true}
              buttonLink={getProjectBriefFormLink()}
              onPrimaryClick={() => trackCTA('about_us_brief', 'about_us_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
