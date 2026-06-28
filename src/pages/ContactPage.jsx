import { Footer, FormCard, FormSubmitButton, Navbar, PageHeader, SEO } from '../components';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA, trackEvent, trackMailto, trackSocial } from '../hooks/useAnalytics';
import {
  EMAIL_KEYS,
  getCompanySocialLinks,
  getContactSubmitEndpoint,
  getEmailAddress,
  getMailtoLink,
  getProjectBookingLink,
} from '../services/externalLinks';
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

export default function ContactPage() {
  const socialLinks = getCompanySocialLinks();

  useTimeOnPage('/contact/');
  useScrollAnimations();

  const handleSubmit = () => {
    trackEvent('contact_form_submit', { source: 'contact_page' });
  };

  return (
    <>
      <SEO
        title="Contact"
        description="Contact Arg Software with a clear project brief. Tell us what you are building, what is risky, and where senior engineering help is needed."
        path="/contact/"
      />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper contact-page background-color-dark">
          <PageHeader
            title={['Everything starts', 'with a clear brief']}
            subtitle="Tell us what you are building, what is risky, and where senior engineering help is needed."
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
                      Hello, nice to meet you.
                    </span>
                    <h2>Send the short version.</h2>
                    <p>
                      No long questionnaire. A name, a way to reply, and the context that matters.
                      If there is a fit, we will ask the precise technical questions next.
                    </p>
                  </div>

                  <div className="contact-form-panel" data-animate="fade-up">
                    <FormCard
                      title="Send a brief"
                      description="Reviewed by senior engineers directly - no sales handoff."
                      action={getContactSubmitEndpoint()}
                      method="POST"
                      onSubmit={handleSubmit}
                      submit={
                        <>
                          <FormSubmitButton>Send brief</FormSubmitButton>
                          <p>
                            We read every word. Keep it direct and concise, it helps us respond
                            faster.
                          </p>
                        </>
                      }
                    >
                      <input type="hidden" name="_subject" value="New ARG contact brief" />
                      <input type="hidden" name="source" value="contact_page" />
                      <div className="form-card__hidden" aria-hidden="true">
                        <label htmlFor="contact-website">Website</label>
                        <input id="contact-website" type="text" name="_gotcha" tabIndex={-1} />
                      </div>

                      <div className="form-card__grid">
                        <label>
                          <span>Name</span>
                          <input
                            id="contact-name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            placeholder="Jane Rivera"
                            required
                          />
                        </label>

                        <label>
                          <span>Email</span>
                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="jane@company.com"
                            required
                          />
                        </label>
                      </div>

                      <label>
                        <span>Company, if any</span>
                        <input
                          id="contact-company"
                          name="company"
                          type="text"
                          autoComplete="organization"
                          placeholder="Where you are building from"
                        />
                      </label>

                      <label>
                        <span>Message</span>
                        <textarea
                          id="contact-message"
                          name="message"
                          placeholder="What are you building? What is hard, urgent, or uncertain?"
                          required
                        />
                      </label>
                    </FormCard>
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
                    <span className="contact-kicker contact-kicker--dark">Prefer direct?</span>
                    <h2>Use the channel that fits the context.</h2>
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
