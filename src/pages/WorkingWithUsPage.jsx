import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA } from '../hooks/useAnalytics';
import {
  Navbar,
  BaseCard,
  Footer,
  CTASection,
  SectionDivider,
  SectionTicker,
  SEO,
  PageHeader,
  TechStackConsole,
} from '../components';
import '../styles/careers.css';

const INTERNAL_VALUES = [
  {
    title: 'Architecture first',
    description:
      "The system is designed before it's written. If we can't explain it clearly, we don't build it yet.",
    antiValue: 'ship fast, fix later',
  },
  {
    title: 'No patchwork',
    description:
      "If a fix needs a workaround, we refactor the abstraction. Band-aids compound; we'd rather pay the cost now.",
    antiValue: 'good enough for now',
  },
  {
    title: 'Production on a Tuesday',
    description:
      'We deploy when we can stay close. We own what we ship: bugs, performance, and the unexpected page.',
    antiValue: 'merge Friday, ghost the weekend',
  },
  {
    title: 'Direct, kind, no politics',
    description:
      'Honest in code review, honest in retro. Small team means every personality compounds.',
    antiValue: "let's circle back offline",
  },
];

const FIT_CHECKS = [
  {
    index: '01',
    title: 'High-stakes architecture',
    description:
      'You are making decisions that will shape the product for years: platform design, migrations, integrations, or a system that needs to scale without becoming fragile.',
  },
  {
    index: '02',
    title: 'Production reliability',
    description:
      'The system is already live, or close to it, and performance, observability, recovery, or operational confidence matters more than another feature sprint.',
  },
  {
    index: '03',
    title: 'Senior execution',
    description:
      'You do not need a large vendor layer. You need people who can reason about the product, write the code, and stay accountable when it reaches production.',
  },
];

const CONVERSATION_STEPS = [
  {
    title: 'Send context',
    description: 'Share the product, constraint, or technical risk you need to solve.',
  },
  {
    title: 'We review the problem',
    description: 'We look for fit before suggesting calls, proposals, or unnecessary process.',
  },
  {
    title: 'You speak with someone technical',
    description: 'The first conversation is with someone who can reason about the system.',
  },
  {
    title: 'We suggest the next move',
    description: 'You leave with a clear recommendation, even if that means ARG is not the fit.',
  },
];

const WHY_US_PILLARS = [
  {
    index: '01 - Method',
    metric: '100%',
    unit: 'of projects',
    title: 'Diagram first. Then code.',
    description:
      'Every engagement opens with a written technical plan you can argue with. Two days on architecture beats two weeks unpicking a wrong call.',
  },
  {
    index: '02 - Domain',
    metric: '10k',
    unit: 'tx/sec, live',
    title: 'The systems that fall over.',
    description:
      'Open-payment rails, real-time audio sync, exchange order flow. The work where it usually works is not a passing grade.',
  },
  {
    index: '03 - Craft',
    metric: '0',
    unit: 'band-aids shipped',
    title: 'Gold standard, not trendy.',
    description:
      'Battle-tested tools we have used in anger, not the ones with the loudest feed. Clean code, easy hand-off when we are done.',
  },
];

const TECH_STACK_INTRO = {
  title: 'The tools are not the point. The operating history is.',
  text: 'This console is a quick map of the stack we trust when the system needs to stay observable, scalable, and easy to hand over after the hard part is done.',
};

export default function WorkingWithUsPage() {
  useTimeOnPage('/working-with-us/');
  useScrollAnimations();

  return (
    <>
      <SEO
        title="Working with Us"
        description="Work with ARG Software to design architecture-first platforms for fintech, media, and high-growth technology teams."
        path="/working-with-us/"
      />
      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={['Work With', 'ARG Software']}
            subtitle="Work with a small architecture-first team that designs the system before writing it, then stays close through production."
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Working with Us' }]}
            sideItems={[
              { label: 'Why ARG', href: '#why-us' },
              { label: 'How we work', href: '#values' },
              { label: 'Fit check', href: '#fit-check' },
              { label: 'Start a conversation', href: '#contact' },
            ]}
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
                      We don't do <span className="cp-whyus-strike">patchwork.</span> We design the
                      system <span>before we write it.</span>
                    </h2>
                  </div>
                  <aside className="cp-whyus-side">
                    <p>
                      ARG is a small, opinionated engineering team. We pick the hard problems on
                      purpose - the systems that have to be right the first time - and we go in
                      architecture-first.
                    </p>
                    <span>ARG Team</span>
                  </aside>
                </header>

                <div className="cp-whyus-pillars">
                  {WHY_US_PILLARS.map((pillar, index) => (
                    <article
                      key={pillar.index}
                      className="cp-whyus-pillar"
                      data-animate-order={index + 1}
                    >
                      <span className="cp-whyus-pillar-index">{pillar.index}</span>
                      <div className="cp-whyus-kpi">
                        <span>{pillar.metric}</span>
                        <small>{pillar.unit}</small>
                      </div>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.description}</p>
                    </article>
                  ))}
                </div>

                <div className="cp-tech-intro" data-animate-order="4">
                  <div>
                    <h3>{TECH_STACK_INTRO.title}</h3>
                    <p>{TECH_STACK_INTRO.text}</p>
                  </div>
                </div>

                <TechStackConsole className="cp-whyus-console" animate={true} animationOrder={5} />
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
                    <span className="cp-line">Four things we actually mean.</span>
                  </h2>
                  <p className="cp-section-subtitle">
                    Most companies list values that could belong to anyone. Ours are operational:
                    they decide what we ship, what we refuse, and who fits on the team.
                  </p>
                </div>
                <div className="cp-values-grid">
                  {INTERNAL_VALUES.map((value, index) => (
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
                      Not every project needs ARG. <span>The hard ones usually do.</span>
                    </h2>
                    <p>
                      Before we talk scope, we look for the shape of the problem: where the risk is,
                      what needs to stay reliable, and whether a small senior team can make a real
                      difference.
                    </p>
                  </div>
                </div>

                <div className="cp-fit-panel" data-animate-order="1">
                  <section className="cp-fit-block" aria-label="Where ARG fits">
                    <SectionTicker label="Where ARG fits" className="cp-fit-ticker" />
                    <div className="cp-fit-columns">
                      {FIT_CHECKS.map(item => (
                        <article key={item.title} className="cp-fit-column">
                          <span className="cp-fit-accent" aria-hidden="true" />
                          <div className="cp-fit-column-heading">
                            <span>{item.index}</span>
                            <h4>{item.title}</h4>
                          </div>
                          <p>{item.description}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section
                    className="cp-fit-block cp-fit-block--process"
                    aria-label="How it starts"
                  >
                    <SectionTicker label="How it starts" className="cp-fit-ticker" />
                    <div className="cp-fit-stepper">
                      <span className="cp-fit-stepper-line" aria-hidden="true" />
                      {CONVERSATION_STEPS.map((step, index) => (
                        <article key={step.title} className="cp-fit-step">
                          <span className="cp-fit-step-number">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h4>{step.title}</h4>
                          <p>{step.description}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper background-color-dark" id="contact">
            <CTASection
              title="Ready to work"
              titleHighlight="with us?"
              buttonTextNotHover="Send us a message"
              buttonTextHover="Let's meet"
              animationClass="cp-animate"
              animate={true}
              buttonLink="mailto:info@arg.software?subject=Working%20with%20ARG"
              onPrimaryClick={() => trackCTA('working_with_us_message', 'working_with_us_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
