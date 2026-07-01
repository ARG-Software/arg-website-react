import { useRef, useState } from 'react';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA, trackEvent } from '../utils/analytics';
import {
  Navbar,
  BaseCard,
  ContactForm,
  Pill,
  PillButton,
  Footer,
  CTASection,
  SectionDivider,
  SEO,
  PageHeader,
  FounderCard,
} from '../components';
import CAREERS_DATA from '../data/jobs.json';
import {
  EMAIL_KEYS,
  getMailtoLink,
  getPersonLinkedInLink,
  PERSON_KEYS,
} from '../services/linksservice';
import '../styles/careers.css';

const JOBS = CAREERS_DATA.jobs;
const CAREER_TRAITS = CAREERS_DATA.careerTraits;
const HIRING_STEPS = CAREERS_DATA.hiringSteps;
const CAREERS_OPEN_ROLES_DESCRIPTION =
  'Explore open roles at Arg Software and apply to join an architecture-first engineering team building complex production systems.';
const CAREERS_NO_ROLES_DESCRIPTION =
  'Arg Software is not hiring today. Learn what we look for in architecture-first engineers and how to reach the founders directly.';

const FOUNDERS = [
  {
    name: 'Jose Antunes',
    initials: 'JA',
    role: 'Co-founder - Software Engineer',
    focus: 'Backend - Systems - Data - AI',
    replyTime: '~ 36 hours',
    emailHref: getMailtoLink(EMAIL_KEYS.JOSE, 'Career Inquiry - Jose Antunes'),
    linkedin: getPersonLinkedInLink(PERSON_KEYS.JOSE),
  },
  {
    name: 'Rui Rocha',
    initials: 'RR',
    role: 'Co-founder - Software Engineer',
    focus: 'Frontend - Mobile - AI',
    replyTime: '~ 36 hours',
    emailHref: getMailtoLink(EMAIL_KEYS.RUI, 'Career Inquiry - Rui Rocha'),
    linkedin: getPersonLinkedInLink(PERSON_KEYS.RUI),
  },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  role: '',
  linkedin: '',
  message: '',
};

function getJobTags(job) {
  return [job.department, job.type, ...job.requirements.slice(0, 3)];
}

function CareerJobCard({ job, index, onApply }) {
  return (
    <BaseCard
      className="cp-career-job-card"
      variant="white"
      padding="xl"
      animate={true}
      animationOrder={index + 1}
    >
      <div className="cp-career-job-main">
        <span className="cp-career-job-dept">{job.department}</span>
        <h3>{job.title}</h3>
        <p>{job.description}</p>
        <div className="cp-career-job-tags">
          {getJobTags(job).map(tag => (
            <Pill key={tag} variant="outline" size="sm">
              {tag}
            </Pill>
          ))}
        </div>
      </div>
      <div className="cp-career-job-meta">
        <Pill variant="outline" size="sm">
          {job.location}
        </Pill>
        <Pill variant="outline" size="sm">
          {job.type}
        </Pill>
        <PillButton
          className="cp-career-job-apply"
          variant="dark"
          size="md"
          onClick={() => onApply(job)}
        >
          Apply
        </PillButton>
      </div>
    </BaseCard>
  );
}

export default function CareersPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const applicationRef = useRef(null);
  const nameInputRef = useRef(null);
  const hasJobs = JOBS.length > 0;
  const seoDescription = hasJobs ? CAREERS_OPEN_ROLES_DESCRIPTION : CAREERS_NO_ROLES_DESCRIPTION;

  useTimeOnPage('/careers/');
  useScrollAnimations();

  const selectedJob = JOBS.find(job => job.id === form.role);
  const applicationFields = [
    {
      name: 'name',
      label: 'Full name',
      type: 'text',
      value: form.name,
      onChange: handleInputChange,
      placeholder: 'Your name',
      required: true,
      layout: 'half',
      ref: nameInputRef,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      value: form.email,
      onChange: handleInputChange,
      placeholder: 'you@example.com',
      required: true,
      layout: 'half',
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      value: form.role,
      onChange: handleInputChange,
      required: true,
      options: [
        { value: '', label: 'Select a role' },
        ...JOBS.map(job => ({ value: job.id, label: job.title })),
      ],
    },
    {
      name: 'linkedin',
      label: 'LinkedIn or portfolio - optional',
      type: 'url',
      value: form.linkedin,
      onChange: handleInputChange,
      placeholder: 'https://linkedin.com/in/yourprofile',
    },
    {
      name: 'message',
      label: 'Why ARG? What have you built?',
      type: 'textarea',
      value: form.message,
      onChange: handleInputChange,
      placeholder: 'A few lines about your work, what you value in a team, and why now...',
      rows: 5,
      required: true,
    },
    {
      name: 'cv',
      label: 'CV / portfolio',
      type: 'file',
      accept: '.pdf,.doc,.docx',
    },
  ];

  const handleApplyClick = job => {
    setForm(current => ({ ...current, role: job.id }));
    trackEvent('career_role_apply_click', {
      job_id: job.id,
      job_title: job.title,
      department: job.department,
    });
    requestAnimationFrame(() => {
      applicationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus({ preventScroll: true });
    });
  };

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  const handleSubmit = () => {
    trackEvent('career_application_submit', {
      job_id: form.role || 'general',
      job_title: selectedJob?.title || 'General application',
    });
  };

  const handleApplicationSuccess = () => {
    trackEvent('career_application_success', {
      job_id: form.role || 'general',
      job_title: selectedJob?.title || 'General application',
    });
    setForm(EMPTY_FORM);
  };

  const handleApplicationError = () => {
    trackEvent('career_application_error', {
      job_id: form.role || 'general',
      job_title: selectedJob?.title || 'General application',
    });
  };

  const handleFounderEmail = founderName => {
    trackEvent('career_founder_email_click', { founder_name: founderName });
  };

  const handleFounderLinkedIn = founderName => {
    trackEvent('career_founder_linkedin_click', { founder_name: founderName });
  };

  return (
    <>
      <SEO title="Careers" description={seoDescription} path="/careers/" />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={
              hasJobs ? ['Careers at ARG', 'Open Roles'] : ['Careers at ARG', 'No Open Roles Today']
            }
            subtitle={
              hasJobs
                ? 'Every role is scoped for meaningful ownership on production systems. No hiring theatre, no filler seats.'
                : 'We are not hiring for a specific role today, but we still want to hear from engineers who think like us. The next opening is often shaped around someone we already know.'
            }
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Careers' }]}
            sideItems={
              hasJobs
                ? [
                    { label: 'Open Roles', href: '#roles', meta: String(JOBS.length) },
                    { label: 'How to Apply', href: '#apply' },
                    { label: 'Contact', href: '#contact' },
                  ]
                : [
                    { label: 'Who We Look For', href: '#who' },
                    { label: 'Talk to the Founders', href: '#founders' },
                    { label: 'Contact', href: '#contact' },
                  ]
            }
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="120"
          >
            {hasJobs ? (
              <>
                <section
                  id="roles"
                  className="cp-careers-roles-section padding-section-large border-radius-top background-color-white"
                >
                  <div className="container padding-global cp-careers-inner">
                    <div className="cp-section-header" data-animate-order="0">
                      <h2 className="cp-section-title">
                        The team is <span className="text-color-gradiant">growing.</span>
                      </h2>
                      <p className="cp-section-subtitle">
                        Focused openings across engineering, infrastructure, product, security, and
                        data. Each one is built for senior contributors with a direct feedback loop.
                      </p>
                    </div>
                    <div className="cp-career-jobs-list">
                      {JOBS.map((job, index) => (
                        <CareerJobCard
                          key={job.id}
                          job={job}
                          index={index}
                          onApply={handleApplyClick}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="padding-bottom padding-80-40"></div>
                  <SectionDivider variant="default" hideOnMobile={false} />
                </section>

                <section
                  id="apply"
                  className="cp-careers-apply-section padding-section-large border-radius-bottom background-color-white"
                  ref={applicationRef}
                >
                  <div className="container padding-global cp-careers-process-grid">
                    <div className="cp-careers-process" data-animate-order="0">
                      <div className="cp-section-header">
                        <h2 className="cp-section-title">
                          How we <span className="text-color-gradiant">hire.</span>
                        </h2>
                        <p className="cp-section-subtitle">
                          Four steps. No take-home puzzles, no ghost stages. We move fast when we
                          find the right person.
                        </p>
                      </div>
                      <div className="cp-careers-steps">
                        {HIRING_STEPS.map((step, index) => (
                          <article key={step.title} className="cp-careers-step">
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <div>
                              <h3>{step.title}</h3>
                              <p>{step.body}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <ContactForm
                      title="Apply for a role"
                      description="Reviewed by founders directly - no recruiter in the middle."
                      fields={applicationFields}
                      submitLabel="Send application"
                      helperText="We reply to every application."
                      subject="New ARG career application"
                      source="careers_page"
                      formName="career_application"
                      onSubmit={handleSubmit}
                      onSuccess={handleApplicationSuccess}
                      onError={handleApplicationError}
                      data-animate-order="1"
                    />
                  </div>
                </section>
              </>
            ) : (
              <>
                <section
                  id="who"
                  className="cp-careers-who-section padding-section-large border-radius-top background-color-white"
                >
                  <div className="container padding-global cp-careers-inner">
                    <div className="cp-section-header" data-animate-order="0">
                      <h2 className="cp-section-title">
                        Not hiring today. But here's{' '}
                        <span className="text-color-gradiant">who we look for.</span>
                      </h2>
                      <p className="cp-section-subtitle">
                        We stay intentionally small and selective. If this sounds like the kind of
                        team where you would do your best work, reach out early - the right
                        conversations are worth having before a role exists.
                      </p>
                    </div>
                    <div className="cp-careers-traits-grid">
                      {CAREER_TRAITS.map((trait, index) => (
                        <article
                          key={trait.title}
                          className="cp-careers-trait"
                          data-animate="fade-up"
                          data-animate-order={index + 1}
                        >
                          <span className="cp-careers-trait-number">
                            <i>{String(index + 1).padStart(2, '0')}</i>
                          </span>
                          <div className="cp-careers-trait-content">
                            <h3>{trait.title}</h3>
                            <p>{trait.body}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div className="padding-bottom padding-80-40"></div>
                  <SectionDivider variant="default" hideOnMobile={false} />
                </section>

                <section
                  id="founders"
                  className="cp-founders-section padding-section-large border-radius-bottom background-color-white"
                >
                  <div className="container padding-global cp-founders-inner">
                    <div className="cp-founders-intro" data-animate-order="0">
                      <h2>
                        We're small. <span>Talk to a founder directly.</span>
                      </h2>
                      <p>
                        No recruiter wall, no ATS black hole. If you think you'd fit at ARG, the
                        fastest way in is a short note to one of us.
                      </p>
                    </div>
                    <div className="cp-founders-grid">
                      {FOUNDERS.map((founder, index) => (
                        <FounderCard
                          key={founder.name}
                          founder={founder}
                          animate={true}
                          animateOrder={index + 1}
                          onEmailClick={handleFounderEmail}
                          onLinkedInClick={handleFounderLinkedIn}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>

          <section className="page-cta-wrapper background-color-dark" id="contact">
            <CTASection
              title={hasJobs ? 'Ready to apply,' : "Think you'd fit,"}
              titleHighlight={hasJobs ? 'show us your work.' : 'reach out anyway.'}
              mobileTitle={hasJobs ? 'Ready to apply?' : "Think you'd fit?"}
              mobileTitleHighlight={hasJobs ? 'Show us your work.' : 'Reach out.'}
              buttonTextNotHover={hasJobs ? 'Email careers' : 'Send us a message'}
              buttonTextHover="Let's talk"
              animationClass="cp-animate"
              animate={true}
              buttonLink={getMailtoLink(EMAIL_KEYS.HR, 'Career Inquiry')}
              onPrimaryClick={() => trackCTA('career_inquiry', 'careers_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
