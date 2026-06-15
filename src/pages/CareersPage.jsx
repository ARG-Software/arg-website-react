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
} from '../components';
import {
  excellenceSvg,
  respectSvg,
  innovationSvg,
  diversitySvg,
} from '../components/icons/ValueIcons';
import JOBS from '../data/jobs.json';
import '../styles/careers.css';

const INTERNAL_VALUES = [
  {
    title: 'Excellence',
    description: 'We choose team members who excel, succeed, and elevate our company standards.',
    icon: excellenceSvg,
  },
  {
    title: 'Respect',
    description:
      'Respecting each other, our clients, our regulations, and deadlines is fundamental at Nesma & Partners.',
    icon: respectSvg,
  },
  {
    title: 'Innovation',
    description: 'We are dedicated to fostering creativity and innovation with our employees.',
    icon: innovationSvg,
  },
  {
    title: 'Diversity',
    description:
      'We welcome individuals from all backgrounds, including those with disabilities or special needs.',
    icon: diversitySvg,
  },
];

const WHY_US_CONTENT = {
  title: 'Why Working with us?',
  description:
    "At ARG, we don't do 'patchwork.' We are architecture-first. Working with us means tackling complex problems in high-concurrency environments, from open-payment protocols to real-time audio synchronization. You'll be part of a team that prioritizes clean code, scalability, and the 'Gold Standard' tech stack—giving you the space to build systems that handle thousands of transactions per second with total confidence.",
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

  return (
    <>
      <SEO
        title="Career & Culture"
        description="Join ARG and tackle complex problems in high-concurrency environments. Build systems that handle thousands of transactions per second."
        path="/careers/"
      />
      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
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
              className="cp-whyus-section padding-section-xlarge border-radius-all background-color-white"
            >
              <div className="container padding-global cp-whyus-inner">
                <div className="cp-whyus-content" data-animate="fade-up">
                  <h2 className="cp-whyus-title">{WHY_US_CONTENT.title}</h2>
                  <p className="cp-whyus-desc">{WHY_US_CONTENT.description}</p>
                </div>
              </div>
            </section>

            <section id="values" className="cp-values-section padding-section-xlarge ">
              <div className="container padding-global cp-values-inner">
                <div className="cp-section-header" data-animate="fade-up">
                  <h2 className="cp-section-title">
                    <span className="cp-line">Internal Values</span>
                  </h2>
                </div>
                <div className="cp-values-grid">
                  {INTERNAL_VALUES.map((value, index) => (
                    <div key={index} className="cp-value-card" data-animate-order={index}>
                      <div className="cp-value-icon">{value.icon}</div>
                      <h3 className="cp-value-title">{value.title}</h3>
                      <p className="cp-value-desc">{value.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section
              id="open-positions"
              className="cp-jobs-section padding-section-xlarge border-radius-all background-color-white"
            >
              <div className="container padding-global cp-jobs-inner">
                <div className="cp-section-header" data-animate="fade-up">
                  <h2 className="cp-section-title">
                    <span className="cp-line">Open Positions</span>
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
                    No open positions at the moment.
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
