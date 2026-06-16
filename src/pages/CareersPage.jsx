import { useState } from 'react';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA, trackEvent } from '../hooks/useAnalytics';
import {
  Navbar,
  Footer,
  CTASection,
  SectionDivider,
  SEO,
  JobAccordion,
  PageHeader,
  FounderCard,
  TechStackConsole,
} from '../components';
import JOBS from '../data/jobs.json';
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

const FOUNDERS = [
  {
    name: 'Jose Antunes',
    initials: 'JA',
    role: 'Co-founder - Software Engineer',
    focus: 'Backend - Systems - Data - AI',
    replyTime: '~ 36 hours',
    emailHref: 'mailto:hr@arg.software?subject=Career%20Inquiry%20-%20Jose%20Antunes',
    linkedin: 'https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/',
  },
  {
    name: 'Rui Rocha',
    initials: 'RR',
    role: 'Co-founder - Software Engineer',
    focus: 'Frontend - Backend - Mobile - AI',
    replyTime: '~ 36 hours',
    emailHref: 'mailto:hr@arg.software?subject=Career%20Inquiry%20-%20Rui%20Rocha',
    linkedin: 'https://www.linkedin.com/in/ruirochawork/',
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

export default function CareersPage() {
  const [openJobId, setOpenJobId] = useState(null);

  useTimeOnPage('/careers/');
  useScrollAnimations();

  const handleJobToggle = jobId => {
    const isOpening = openJobId !== jobId;
    setOpenJobId(isOpening ? jobId : null);
    if (isOpening) {
      const job = JOBS.find(j => j.id === jobId);
      if (job) {
        trackEvent('job_accordion_open', { job_title: job.title, department: job.department });
      }
    }
  };

  const handleJobApply = job => {
    trackEvent('job_apply', { job_title: job.title, department: job.department });
    const subject = encodeURIComponent(`${job.title} - Application`);
    window.location.href = `mailto:hr@arg.software?subject=${subject}`;
  };

  const handleFounderEmail = founderName => {
    trackEvent('career_founder_email_click', { founder_name: founderName });
  };

  const handleFounderLinkedIn = founderName => {
    trackEvent('career_founder_linkedin_click', { founder_name: founderName });
  };

  return (
    <>
      <SEO
        title="Career & Culture"
        description="Join ARG and tackle complex problems in high-concurrency environments. Build systems that handle thousands of transactions per second."
        path="/careers/"
      />
      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-white">
          <PageHeader
            title={['Take Your Career', 'to New Heights']}
            subtitle="Join us and unlock opportunities for growth, innovation, and success in an inclusive environment that nurtures talent."
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Careers' }]}
            sideItems={[
              { label: 'Why Working with us?', href: '#why-us' },
              { label: 'Internal Values', href: '#values' },
              { label: 'Open Positions', href: '#open-positions', meta: String(JOBS.length) },
              { label: 'Contact', href: '#contact' },
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
              className="cp-whyus-section padding-section-large border-radius-all background-color-white"
            >
              <div className="container padding-global cp-whyus-inner">
                <header className="cp-whyus-header" data-animate="fade-up">
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
                      data-animate-order={index}
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

                <div className="cp-tech-intro" data-animate="fade-up">
                  <div>
                    <h3>{TECH_STACK_INTRO.title}</h3>
                    <p>{TECH_STACK_INTRO.text}</p>
                  </div>
                </div>

                <TechStackConsole className="cp-whyus-console" />
              </div>
            </section>

            <div className="section-divider-wrapper cp-section-divider">
              <SectionDivider variant="default" hideOnMobile={false} />
            </div>

            <section
              id="values"
              className="cp-values-section padding-section-large border-radius-all background-color-white"
            >
              <div className="container padding-global cp-values-inner">
                <div className="cp-section-header" data-animate="fade-up">
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
                    <article
                      key={value.title}
                      className="cp-value-card"
                      data-animate="fade-up"
                      data-animate-order={index}
                    >
                      <span className="cp-value-number">{String(index + 1).padStart(2, '0')}</span>
                      <h3 className="cp-value-title">{value.title}</h3>
                      <p className="cp-value-desc">{value.description}</p>
                      <div className="cp-value-anti">
                        <strong>NOT</strong> {value.antiValue}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <div className="section-divider-wrapper cp-section-divider">
              <SectionDivider variant="default" hideOnMobile={false} />
            </div>

            <section
              id="open-positions"
              className="cp-jobs-section padding-section-large border-radius-all background-color-white"
            >
              <div className="container padding-global cp-jobs-inner">
                <div className="cp-section-header" data-animate="fade-up">
                  <h2 className="cp-section-title">
                    <span className="cp-line"></span>
                  </h2>
                </div>

                {JOBS.length > 0 ? (
                  <div className="cp-jobs-list">
                    {JOBS.map((job, index) => (
                      <div key={job.id} data-animate-order={index}>
                        <JobAccordion
                          job={job}
                          isOpen={openJobId === job.id}
                          onToggle={() => handleJobToggle(job.id)}
                          onApply={handleJobApply}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cp-jobs-empty" data-animate="fade-up">
                    <div className="cp-jobs-empty-header">
                      <h3>
                        Although we are not hiring you can talk to us.{' '}
                        <span>Talk to a founder directly.</span>
                      </h3>
                      <p>
                        No recruiter wall, no ATS black hole. If you think you'd fit at ARG, the
                        fastest way in is a short note to one of us. We read every email and reply
                        when there is a real fit.
                      </p>
                    </div>
                    <div className="cp-founders-grid">
                      {FOUNDERS.map((founder, index) => (
                        <FounderCard
                          key={founder.name}
                          founder={founder}
                          animateOrder={index}
                          onEmailClick={handleFounderEmail}
                          onLinkedInClick={handleFounderLinkedIn}
                        />
                      ))}
                    </div>
                    <div className="cp-jobs-empty-footer">
                      <span>or</span>
                      <a
                        href="mailto:hr@arg.software?subject=Career%20Inquiry"
                        onClick={() => trackEvent('career_general_email_click')}
                      >
                        Send a general hello -&gt;
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="section-divider-wrapper">
            <SectionDivider variant="default" hideOnMobile={false} />
          </div>
          <div className="page-cta-wrapper" id="contact">
            <CTASection
              title="Didn't find any match,"
              titleHighlight="reach to us anyway!"
              buttonTextNotHover="Send us a message"
              buttonTextHover="Let's meet"
              animationClass="cp-animate"
              buttonLink="mailto:hr@arg.software?subject=Career%20Inquiry"
              onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
