import { Navbar, Footer, CTASection, SEO, PageHeader } from '../components';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA } from '../hooks/useAnalytics';

export default function TermsPage() {
  useTimeOnPage('/terms/');
  useScrollAnimations();

  return (
    <>
      <SEO
        title="Terms of Service"
        description="Arg Software's terms of service — the conditions governing the use of our website and services."
        path="/terms/"
        noIndex
      />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />
        <main className="main-wrapper">
          <PageHeader
            title={['Terms of Service', 'Conditions governing the use of our website and services']}
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Terms' }]}
            size="small"
          />
          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section className="legal-section">
              <div className="container padding-global">
                <article className="legal-content">
                  <div data-animate="fade-up" data-animate-order="0">
                    <p className="legal-intro">
                      These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of
                      the Arg Software website (arg.software) and any related services provided by
                      Arg Software (&ldquo;ARG,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                      &ldquo;our&rdquo;). By accessing our website or engaging our services, you
                      agree to be bound by these Terms. If you do not agree, please do not use our
                      website or services.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="1">
                    <h2>1. Services</h2>
                    <p>
                      ARG provides custom software development, architecture consulting, SaaS
                      development, fintech solutions, blockchain development, cloud infrastructure
                      services, and related professional services. The specific scope, deliverables,
                      timeline, and fees for any project are defined in a separate written agreement
                      or statement of work between ARG and the client.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="2">
                    <h2>2. Use of Our Website</h2>
                    <p>When using our website, you agree that you will not:</p>
                    <ul>
                      <li>Violate any applicable laws or regulations</li>
                      <li>Attempt to gain unauthorized access to our systems or user data</li>
                      <li>
                        Use automated means (bots, scrapers, crawlers) to access or collect data
                        without our express permission
                      </li>
                      <li>Transmit malware, viruses, or harmful code</li>
                      <li>Interfere with the proper functioning of the website</li>
                      <li>Use the website to send unsolicited communications or spam</li>
                    </ul>
                    <p>
                      We reserve the right to restrict or terminate access to our website for any
                      violation of these Terms.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="3">
                    <h2>3. Intellectual Property</h2>
                    <h3>3.1 Our Content</h3>
                    <p>
                      All content on this website &mdash; including text, graphics, logos, icons,
                      images, software code, and design elements &mdash; is the property of ARG or
                      its content suppliers and is protected by international copyright and
                      intellectual property laws. You may not reproduce, distribute, modify, or
                      create derivative works from our content without our prior written consent.
                    </p>
                    <h3>3.2 Client Deliverables</h3>
                    <p>
                      Intellectual property rights for work product, code, designs, and deliverables
                      created for clients are addressed in the individual service agreement. Unless
                      otherwise agreed in writing, ARG retains ownership of any pre-existing tools,
                      frameworks, libraries, and methodologies used during the engagement, while the
                      client retains ownership of project-specific deliverables upon full payment.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="4">
                    <h2>4. Confidentiality</h2>
                    <p>
                      ARG and the client mutually agree to keep confidential any proprietary or
                      sensitive information disclosed during the course of a project engagement.
                      This includes business strategies, technical specifications, source code,
                      trade secrets, and any information marked as confidential. Confidentiality
                      obligations survive the termination of the engagement. Specific
                      confidentiality terms may be outlined in a separate non-disclosure agreement.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="5">
                    <h2>5. Third-Party Links and Services</h2>
                    <p>
                      Our website may contain links to third-party websites, tools, or services that
                      are not owned or controlled by ARG. We are not responsible for the content,
                      privacy policies, or practices of any third-party websites. You access
                      third-party links at your own risk.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="6">
                    <h2>6. Limitation of Liability</h2>
                    <p>
                      To the fullest extent permitted by applicable law, ARG shall not be liable for
                      any indirect, incidental, special, consequential, or punitive damages arising
                      out of or related to your use of our website or services, even if we have been
                      advised of the possibility of such damages. This includes, but is not limited
                      to, loss of profits, data, business opportunities, or goodwill.
                    </p>
                    <p>
                      Our total liability for any claim arising from or relating to these Terms or
                      our services shall not exceed the total fees paid by you to ARG in the twelve
                      months preceding the event giving rise to the claim.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="7">
                    <h2>7. Disclaimer of Warranties</h2>
                    <p>
                      Our website and services are provided on an &ldquo;as is&rdquo; and &ldquo;as
                      available&rdquo; basis, without warranties of any kind, either express or
                      implied. We do not warrant that the website will be uninterrupted, error-free,
                      or free of harmful components. We disclaim all implied warranties, including
                      merchantability, fitness for a particular purpose, and non-infringement.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="8">
                    <h2>8. Payment Terms</h2>
                    <p>
                      Payment terms for our services are defined in the individual project agreement
                      or statement of work. Generally, our fees are invoiced according to an
                      agreed-upon schedule (e.g., milestone-based, monthly, or upfront). Late
                      payments may be subject to interest charges as specified in the agreement. All
                      fees are exclusive of applicable taxes unless stated otherwise.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="9">
                    <h2>9. Termination</h2>
                    <p>
                      Either party may terminate a project engagement in accordance with the terms
                      specified in the individual service agreement. We reserve the right to suspend
                      or terminate access to our website at any time, without prior notice, for
                      conduct that we believe violates these Terms or is harmful to us, our users,
                      or third parties.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="10">
                    <h2>10. Governing Law</h2>
                    <p>
                      These Terms shall be governed by and construed in accordance with the laws of
                      Portugal, without regard to its conflict of law principles. Any disputes
                      arising out of or related to these Terms shall be subject to the exclusive
                      jurisdiction of the courts of Portugal.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="11">
                    <h2>11. Changes to These Terms</h2>
                    <p>
                      We reserve the right to update or modify these Terms at any time. We will post
                      the revised version on this page and update the &ldquo;Last Updated&rdquo;
                      date. Your continued use of our website or services after any changes
                      constitutes your acceptance of the revised Terms. We encourage you to review
                      these Terms periodically.
                    </p>
                  </div>

                  <div data-animate="fade-up" data-animate-order="12">
                    <h2>12. Contact Us</h2>
                    <p>If you have any questions about these Terms, please contact us at:</p>
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
                  </div>
                </article>
              </div>
            </section>
          </div>
          <div className="page-cta-wrapper">
            <CTASection
              title="Ready to build"
              titleHighlight="with us?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="legal-animate"
              animate={true}
              buttonLink="mailto:info@arg.software?subject=Terms%20Inquiry"
              onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
            />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
