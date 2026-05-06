import { useState } from 'react';
import { useScrollAnimations } from '../hooks';
import { Navbar, Footer, CTASection, SectionDivider, SEO } from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { arrowSvg } from '../components/icons/SocialIcons';
import JOBS from '../data/jobs.json';
import '../styles/careers.css';

const VALUE_ICONS = {
  excellence: '/images/value-excellence.svg',
  respect: '/images/value-respect.svg',
  innovation: '/images/value-innovation.svg',
  diversity: '/images/value-diversity.svg',
};

const INTERNAL_VALUES = [
  {
    title: 'Excellence',
    description: 'We choose team members who excel, succeed, and elevate our company standards.',
    icon: VALUE_ICONS.excellence,
  },
  {
    title: 'Respect',
    description:
      'Respecting each other, our clients, our regulations, and deadlines is fundamental at Nesma & Partners.',
    icon: VALUE_ICONS.respect,
  },
  {
    title: 'Innovation',
    description: 'We are dedicated to fostering creativity and innovation with our employees.',
    icon: VALUE_ICONS.innovation,
  },
  {
    title: 'Diversity',
    description:
      'We welcome individuals from all backgrounds, including those with disabilities or special needs.',
    icon: VALUE_ICONS.diversity,
  },
];

const WHY_US_CONTENT = {
  title: 'Why Working with us?',
  description:
    "At ARG, we don't do 'patchwork.' We are architecture-first. Working with us means tackling complex problems in high-concurrency environments, from open-payment protocols to real-time audio synchronization. You'll be part of a team that prioritizes clean code, scalability, and the 'Gold Standard' tech stack—giving you the space to build systems that handle thousands of transactions per second with total confidence.",
};

function JobAccordion({ job, isOpen, onToggle }) {
  const handleApply = e => {
    e.preventDefault();
    const subject = encodeURIComponent(`${job.title} - Application`);
    window.location.href = `mailto:hr@arg.software?subject=${subject}`;
  };

  return (
    <div className={`cp-job-item ${isOpen ? 'is-open' : ''}`}>
      <button className="cp-job-header" onClick={onToggle} aria-expanded={isOpen}>
        <div className="cp-job-info">
          <h3 className="cp-job-title">{job.title}</h3>
          <div className="cp-job-meta">
            <span className="cp-job-department">{job.department}</span>
            <span className="cp-job-separator">•</span>
            <span className="cp-job-location">{job.location}</span>
            <span className="cp-job-separator">•</span>
            <span className="cp-job-type">{job.type}</span>
          </div>
        </div>
        <div className="cp-job-toggle">
          <div className="cp-job-toggle-icon arrow_icon-embed w-embed">{arrowSvg}</div>
        </div>
      </button>
      <div className="cp-job-content">
        <div className="cp-job-content-inner">
          <p className="cp-job-description">{job.description}</p>
          <div className="cp-job-requirements">
            <h4>Requirements</h4>
            <ul>
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
          <form className="cp-job-form" onSubmit={handleApply}>
            <div className="cp-job-form-row">
              <div className="cp-form-group">
                <label htmlFor={`name-${job.id}`}>Full Name</label>
                <input type="text" id={`name-${job.id}`} name="name" required />
              </div>
              <div className="cp-form-group">
                <label htmlFor={`email-${job.id}`}>Email Address</label>
                <input type="email" id={`email-${job.id}`} name="email" required />
              </div>
            </div>
            <div className="cp-job-form-row">
              <div className="cp-form-group">
                <label htmlFor={`phone-${job.id}`}>Phone Number</label>
                <input type="tel" id={`phone-${job.id}`} name="phone" />
              </div>
              <div className="cp-form-group">
                <label htmlFor={`cv-${job.id}`}>CV / Resume</label>
                <input type="file" id={`cv-${job.id}`} name="cv" accept=".pdf,.doc,.docx" />
              </div>
            </div>
            <div className="cp-form-group">
              <label htmlFor={`cover-${job.id}`}>Cover Letter</label>
              <textarea
                id={`cover-${job.id}`}
                name="coverLetter"
                rows={4}
                placeholder="Tell us why you're interested in this role..."
              ></textarea>
            </div>
            <button type="submit" className="button-base button-contact">
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">Apply Now</div>
                <div className="button-base__button-text is-animated">Submit {arrowSvg}</div>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CareersPage() {
  const [openJobId, setOpenJobId] = useState(null);

  useScrollAnimations();

  const handleJobToggle = jobId => {
    setOpenJobId(openJobId === jobId ? null : jobId);
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
          <SubpageHero
            title={['Take Your Career', 'to New Heights']}
            subtitle="Join us and unlock opportunities for growth, innovation, and success in an inclusive environment that nurtures talent."
            breadcrumbs={[
              { label: 'Home', path: '/' },
              { label: 'Career & Culture', path: '/careers/' },
            ]}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section className="cp-whyus-section padding-section-large border-radius-all background-color-white">
              <div className="container padding-global">
                <div className="cp-whyus-content" data-animate="fade-up">
                  <h2 className="cp-whyus-title">{WHY_US_CONTENT.title}</h2>
                  <p className="cp-whyus-desc">{WHY_US_CONTENT.description}</p>
                </div>
              </div>
            </section>

            <section className="cp-values-section padding-section-large">
              <div className="container padding-global cp-values-inner">
                <div className="cp-section-header" data-animate="fade-up">
                  <h2 className="cp-section-title">
                    <span className="cp-line">Internal Values</span>
                  </h2>
                </div>
                <div className="cp-values-grid">
                  {INTERNAL_VALUES.map((value, index) => (
                    <div key={index} className="cp-value-card">
                      <div className="cp-value-icon">
                        <img src={value.icon} alt={value.title} />
                      </div>
                      <h3 className="cp-value-title">{value.title}</h3>
                      <p className="cp-value-desc">{value.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="cp-jobs-section padding-section-large border-radius-all background-color-white">
              <div className="container padding-global cp-jobs-inner">
                <div className="cp-section-header" data-animate="fade-up">
                  <h2 className="cp-section-title">
                    <span className="cp-line">Open Positions</span>
                  </h2>
                </div>
                {JOBS.length > 0 ? (
                  <div className="cp-jobs-list">
                    {JOBS.map(job => (
                      <JobAccordion
                        key={job.id}
                        job={job}
                        isOpen={openJobId === job.id}
                        onToggle={() => handleJobToggle(job.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="cp-jobs-empty">No open positions at the moment.</div>
                )}
              </div>
            </section>
          </div>

          <div className="section-divider-wrapper">
            <SectionDivider variant="default" hideOnMobile={false} />
          </div>
          <div className="page-cta-wrapper">
            <CTASection
              title="Didn't find any match,"
              titleHighlight="reach to us anyway!"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="cp-animate"
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
