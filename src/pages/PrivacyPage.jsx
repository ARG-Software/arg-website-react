import { Navbar, Footer, CTASection, SEO } from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { useScrollAnimations } from '../hooks';

export default function PrivacyPage() {
  useScrollAnimations();

  return (
    <>
      <SEO
        title="Privacy Policy"
        description="ARG Software's privacy policy — how we collect, use, and protect your personal data."
        path="/privacy/"
        noIndex
      />
      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />
        <main className="main-wrapper">
          <SubpageHero
            title="Privacy Policy"
            subtitle="How we collect, use, and protect your information"
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Privacy Policy' }]}
            size="small"
          />
          <section className="legal-section">
            <div className="container padding-global">
              <article className="legal-content">
                <p className="legal-intro">
                  This Privacy Policy describes how Arg Software (&ldquo;ARG,&rdquo;
                  &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores,
                  and protects your personal data when you visit our website (arg.software), use our
                  services, or interact with us. We are committed to protecting your privacy and
                  handling your data in an open and transparent manner.
                </p>

                <h2>1. Information We Collect</h2>
                <p>
                  We collect information you provide directly to us when you fill out forms,
                  subscribe to our newsletter, book a meeting, or communicate with us. This may
                  include:
                </p>
                <ul>
                  <li>Your name and email address</li>
                  <li>Company name and role</li>
                  <li>Project details and messages you send us</li>
                  <li>Communication preferences</li>
                </ul>
                <p>
                  We also collect certain information automatically when you visit our website,
                  including:
                </p>
                <ul>
                  <li>IP address and browser type</li>
                  <li>Pages visited and time spent on the site</li>
                  <li>Referral source and navigation patterns</li>
                  <li>Device information and operating system</li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>
                    Deliver and improve our software development, architecture consulting, and
                    related services
                  </li>
                  <li>Respond to your inquiries and schedule meetings</li>
                  <li>Send relevant communications, including newsletters and service updates</li>
                  <li>Analyze website usage to improve our content and user experience</li>
                  <li>Maintain the security and integrity of our systems</li>
                  <li>Comply with legal obligations and enforce our agreements</li>
                </ul>

                <h2>3. Cookies and Tracking</h2>
                <p>
                  Our website uses cookies and similar tracking technologies to enhance your
                  browsing experience, analyze site traffic, and understand visitor behavior. You
                  can control cookie preferences through your browser settings. We use the following
                  types of cookies:
                </p>
                <ul>
                  <li>
                    <strong>Essential cookies:</strong> Required for the website to function
                    properly
                  </li>
                  <li>
                    <strong>Analytics cookies:</strong> Help us understand how visitors interact
                    with the site (e.g., page views, session duration)
                  </li>
                  <li>
                    <strong>Functional cookies:</strong> Remember your preferences and improve your
                    experience
                  </li>
                </ul>

                <h2>4. Data Sharing and Disclosure</h2>
                <p>
                  We do not sell your personal data. We may share your information with trusted
                  third-party service providers who assist us in operating our website and
                  delivering our services, including:
                </p>
                <ul>
                  <li>Analytics providers (to understand site usage)</li>
                  <li>Calendar and scheduling tools (to book meetings)</li>
                  <li>Email and newsletter platforms (to communicate with you)</li>
                  <li>Hosting and infrastructure providers</li>
                </ul>
                <p>
                  These providers are contractually obligated to protect your data and use it only
                  for the purposes we specify. We may also disclose information when required by law
                  or to protect our rights.
                </p>

                <h2>5. Data Retention</h2>
                <p>
                  We retain your personal data only for as long as necessary to fulfill the purposes
                  outlined in this policy, or as required by applicable law. When we no longer need
                  your data, we securely delete or anonymize it.
                </p>

                <h2>6. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your
                  personal data against unauthorized access, alteration, disclosure, or destruction.
                  These include encryption, access controls, and regular security reviews. However,
                  no method of transmission over the Internet or electronic storage is 100% secure,
                  and we cannot guarantee absolute security.
                </p>

                <h2>7. Your Rights</h2>
                <p>Depending on your jurisdiction, you may have the right to:</p>
                <ul>
                  <li>Access the personal data we hold about you</li>
                  <li>Correct inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Restrict or object to certain processing activities</li>
                  <li>Data portability (receive your data in a structured format)</li>
                  <li>Withdraw consent where processing is based on consent</li>
                </ul>
                <p>
                  To exercise any of these rights, contact us at{' '}
                  <a href="mailto:info@arg.software">info@arg.software</a>. We will respond within
                  the timeframe required by applicable law.
                </p>

                <h2>8. International Transfers</h2>
                <p>
                  As a company based in Portugal serving clients globally, your data may be
                  transferred to and processed in countries outside your country of residence. We
                  ensure appropriate safeguards are in place for any such transfers in compliance
                  with applicable data protection laws, including the EU General Data Protection
                  Regulation (GDPR).
                </p>

                <h2>9. Children&apos;s Privacy</h2>
                <p>
                  Our services are not directed to individuals under the age of 16. We do not
                  knowingly collect personal data from children. If we learn that we have collected
                  personal data from a child without parental consent, we will delete that
                  information promptly.
                </p>

                <h2>10. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our
                  practices or applicable laws. We will post the updated version on this page and
                  update the &ldquo;Last Updated&rdquo; date. Continued use of our website after
                  changes constitutes acceptance of the revised policy.
                </p>

                <h2>11. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy or wish to exercise your data
                  rights, please contact us at:
                </p>
                <p>
                  Arg Software
                  <br />
                  Funchal and Porto, Portugal
                  <br />
                  Email: <a href="mailto:info@arg.software">info@arg.software</a>
                </p>
                <p>
                  <i>Last updated: April 2026</i>
                </p>
              </article>
            </div>
          </section>
          <div className="page-cta-wrapper">
            <CTASection
              title="Ready to build"
              titleHighlight="with us?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="legal-animate"
            />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
