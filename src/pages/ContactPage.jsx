import { ContactForm, Footer, Navbar, PageHeader, SEO } from '../components';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA, trackEvent, trackMailto, trackSocial } from '../hooks/useAnalytics';
import {
  EMAIL_KEYS,
  getCompanySocialLinks,
  getEmailAddress,
  getMailtoLink,
  getProjectBookingLink,
} from '../services/linksservice';
import '../styles/contact.css';

const CONTACT_METHODS = [
  {
    label: 'New business',
    value: getEmailAddress(EMAIL_KEYS.HELLO),
    href: getMailtoLink(EMAIL_KEYS.HELLO, 'Project Brief'),
    event: 'hello',
  },
  {
    label: 'General',
    value: getEmailAddress(EMAIL_KEYS.INFO),
    href: getMailtoLink(EMAIL_KEYS.INFO, 'ARG Contact'),
    event: 'info',
  },
];

const CONTACT_FIELDS = [
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
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'jane@company.com',
    required: true,
    layout: 'half',
  },
  {
    name: 'company',
    label: 'Company',
    type: 'text',
    autoComplete: 'organization',
    placeholder: 'Optional',
  },
  {
    name: 'message',
    label: 'Message',
    type: 'textarea',
    placeholder: 'What are you building? What is hard, urgent, or uncertain?',
    required: true,
  },
];

export default function ContactPage() {
  const socialLinks = getCompanySocialLinks();

  useTimeOnPage('/contact/');
  useScrollAnimations();

  const handleSubmit = () => {
    trackEvent('contact_form_submit', { source: 'contact_page' });
  };

  const handleSuccess = () => {
    trackEvent('contact_form_success', { source: 'contact_page' });
  };

  const handleError = () => {
    trackEvent('contact_form_error', { source: 'contact_page' });
  };

  return (
    <>
      <SEO
        title="Contact"
        description="Contact Arg Software with a clear project brief. Tell us what you are building, what feels risky, and where senior engineering help is needed."
        path="/contact/"
      />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper contact-page background-color-dark">
          <PageHeader
            title={['Everything starts', 'with a clear brief']}
            subtitle="Tell us what you are building, what feels risky, and where senior engineering help is needed."
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Contact' }]}
            sideItems={[
              { label: 'Send a brief', href: '#brief' },
              { label: 'Direct contact', href: '#direct' },
            ]}
            size="small"
          />

          <section
            id="brief"
            className="contact-brief"
            data-animate-scope
            data-animate-default-stagger="100"
          >
            <div className="padding-global">
              <div className="container-large">
                <div className="contact-brief__grid">
                  <div className="contact-brief__intro" data-animate="slide-from-left">
                    <span className="contact-kicker contact-kicker--dark">
                      Hello. Nice to meet you.
                    </span>
                    <h2>Send the short version.</h2>
                    <p>
                      No long questionnaire. Just your name, a way to reply, and the context that
                      matters. If it looks like a fit, we will ask the precise technical questions
                      next.
                    </p>
                  </div>

                  <div className="contact-form-panel" data-animate="fade-up">
                    <ContactForm
                      title="Send a brief"
                      description="Reviewed directly by senior engineers. No sales handoff."
                      fields={CONTACT_FIELDS}
                      submitLabel="Send brief"
                      submitHoverLabel="See you soon"
                      helperText="We read every word. Keep it direct and concise so we can respond faster."
                      subject="New ARG contact brief"
                      source="contact_page"
                      formName="contact_page_brief"
                      onSubmit={handleSubmit}
                      onSuccess={handleSuccess}
                      onError={handleError}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            id="direct"
            className="contact-direct"
            data-animate-scope
            data-animate-default-stagger="100"
          >
            <div className="padding-global">
              <div className="container-large">
                <div className="contact-direct__grid">
                  <div className="contact-direct__headline" data-animate="fade-up">
                    <span className="contact-kicker contact-kicker--dark">
                      Prefer a direct route?
                    </span>
                    <h2>
                      Email us directly or book time if a live conversation will save
                      back-and-forth.
                    </h2>
                  </div>

                  <div className="contact-direct__cards">
                    {CONTACT_METHODS.map(method => (
                      <a
                        key={method.event}
                        href={method.href}
                        className="contact-direct__card"
                        data-animate="fade-up"
                        onClick={() => trackMailto(method.label, 'contact_page')}
                      >
                        <span>{method.label}</span>
                        <strong>{method.value}</strong>
                      </a>
                    ))}
                    <a
                      href={getProjectBookingLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-direct__card contact-direct__card--strong"
                      data-animate="fade-up"
                      onClick={() => trackCTA('book_meeting', 'contact_page')}
                    >
                      <span>Calendar</span>
                      <strong>Book a meeting</strong>
                    </a>
                  </div>

                  <div className="contact-social" data-animate="fade-up">
                    {socialLinks.map(link => (
                      <a
                        key={link.event}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackSocial(link.event, 'contact_page')}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Footer />
        </main>
      </div>
    </>
  );
}
