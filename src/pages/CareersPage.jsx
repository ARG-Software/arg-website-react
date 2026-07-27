import { useRef, useState } from 'react';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@utils/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { BaseCard } from '@components/cards/BaseCard';
import { ContactForm } from '@components/forms/ContactForm';
import { Pill, PillButton } from '@components/pills/Pill';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@components/layout/SectionDivider';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { FounderCard } from '@components/cards/FounderCard';
import CAREERS_DATA from '../data/jobs.json';
import CAREERS_PAGE from '../data/careersPage.json';
import {
  EMAIL_KEYS,
  getMailtoLink,
  getPersonLinkedInLink,
  PERSON_KEYS,
} from '../services/linksService';
import '../styles/careers.css';

const JOBS = CAREERS_DATA.jobs;
const CAREER_TRAITS = CAREERS_DATA.careerTraits;
const HIRING_STEPS = CAREERS_DATA.hiringSteps;

const FOUNDERS = CAREERS_PAGE.founders.cards.map(founder => ({
  ...founder,
  emailHref: getMailtoLink(EMAIL_KEYS[founder.emailKey], founder.emailSubject),
  linkedin: getPersonLinkedInLink(PERSON_KEYS[founder.personKey]),
}));

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
  const seoDescription = hasJobs
    ? CAREERS_PAGE.seo.openRolesDescription
    : CAREERS_PAGE.seo.noRolesDescription;

  useTimeOnPage('/careers/');
  useScrollAnimations();

  const selectedJob = JOBS.find(job => job.id === form.role);
  const applicationFields = [
    {
      name: 'name',
      label: CAREERS_PAGE.applicationForm.fields.name.label,
      type: 'text',
      value: form.name,
      onChange: handleInputChange,
      placeholder: CAREERS_PAGE.applicationForm.fields.name.placeholder,
      required: true,
      layout: 'half',
      ref: nameInputRef,
    },
    {
      name: 'email',
      label: CAREERS_PAGE.applicationForm.fields.email.label,
      type: 'email',
      value: form.email,
      onChange: handleInputChange,
      placeholder: CAREERS_PAGE.applicationForm.fields.email.placeholder,
      required: true,
      layout: 'half',
    },
    {
      name: 'role',
      label: CAREERS_PAGE.applicationForm.fields.role.label,
      type: 'select',
      value: form.role,
      onChange: handleInputChange,
      required: true,
      options: [
        { value: '', label: CAREERS_PAGE.applicationForm.fields.role.placeholder },
        ...JOBS.map(job => ({ value: job.id, label: job.title })),
      ],
    },
    {
      name: 'linkedin',
      label: CAREERS_PAGE.applicationForm.fields.linkedin.label,
      type: 'url',
      value: form.linkedin,
      onChange: handleInputChange,
      placeholder: CAREERS_PAGE.applicationForm.fields.linkedin.placeholder,
    },
    {
      name: 'message',
      label: CAREERS_PAGE.applicationForm.fields.message.label,
      type: 'textarea',
      value: form.message,
      onChange: handleInputChange,
      placeholder: CAREERS_PAGE.applicationForm.fields.message.placeholder,
      rows: 5,
      required: true,
    },
    {
      name: 'cv',
      label: CAREERS_PAGE.applicationForm.fields.cv.label,
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
      <SEO title={CAREERS_PAGE.seo.title} description={seoDescription} path="/careers/" />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper background-color-dark">
          <PageHeader
            title={hasJobs ? CAREERS_PAGE.hero.openRolesTitle : CAREERS_PAGE.hero.noRolesTitle}
            subtitle={
              hasJobs ? CAREERS_PAGE.hero.openRolesSubtitle : CAREERS_PAGE.hero.noRolesSubtitle
            }
            breadcrumbs={CAREERS_PAGE.hero.breadcrumbs}
            sideItems={
              hasJobs
                ? CAREERS_PAGE.hero.openRolesSideItems.map((item, index) =>
                    index === 0 ? { ...item, meta: String(JOBS.length) } : item
                  )
                : CAREERS_PAGE.hero.noRolesSideItems
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
                        {CAREERS_PAGE.roles.title}{' '}
                        <span className="text-color-gradiant">
                          {CAREERS_PAGE.roles.titleHighlight}
                        </span>
                      </h2>
                      <p className="cp-section-subtitle">{CAREERS_PAGE.roles.subtitle}</p>
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
                          {CAREERS_PAGE.hiring.title}{' '}
                          <span className="text-color-gradiant">
                            {CAREERS_PAGE.hiring.titleHighlight}
                          </span>
                        </h2>
                        <p className="cp-section-subtitle">{CAREERS_PAGE.hiring.subtitle}</p>
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
                      title={CAREERS_PAGE.applicationForm.title}
                      description={CAREERS_PAGE.applicationForm.description}
                      fields={applicationFields}
                      submitLabel={CAREERS_PAGE.applicationForm.submitLabel}
                      helperText={CAREERS_PAGE.applicationForm.helperText}
                      subject={CAREERS_PAGE.applicationForm.subject}
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
                        {CAREERS_PAGE.who.title}{' '}
                        <span className="text-color-gradiant">
                          {CAREERS_PAGE.who.titleHighlight}
                        </span>
                      </h2>
                      <p className="cp-section-subtitle">{CAREERS_PAGE.who.subtitle}</p>
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
                        {CAREERS_PAGE.founders.title}{' '}
                        <span>{CAREERS_PAGE.founders.titleHighlight}</span>
                      </h2>
                      <p>{CAREERS_PAGE.founders.intro}</p>
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
              title={hasJobs ? CAREERS_PAGE.cta.openRolesTitle : CAREERS_PAGE.cta.noRolesTitle}
              titleHighlight={
                hasJobs
                  ? CAREERS_PAGE.cta.openRolesTitleHighlight
                  : CAREERS_PAGE.cta.noRolesTitleHighlight
              }
              mobileTitle={
                hasJobs
                  ? CAREERS_PAGE.cta.openRolesMobileTitle
                  : CAREERS_PAGE.cta.noRolesMobileTitle
              }
              mobileTitleHighlight={
                hasJobs
                  ? CAREERS_PAGE.cta.openRolesMobileTitleHighlight
                  : CAREERS_PAGE.cta.noRolesMobileTitleHighlight
              }
              buttonTextNotHover={
                hasJobs ? CAREERS_PAGE.cta.openRolesButtonText : CAREERS_PAGE.cta.noRolesButtonText
              }
              buttonTextHover={CAREERS_PAGE.cta.buttonTextHover}
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
