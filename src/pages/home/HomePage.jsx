import { useState } from 'react';
import { loadBlogPosts } from '../../utils/blog';
import { useScrollAnimations } from '../../hooks';
import { SEO, Navbar, Footer, EmailCaptureForm, Marquee, SectionDivider } from '../../components';
import AppLink from '../../components/navigation/AppLink';
import { arrowSvg } from '../../components/icons/SocialIcons';
import { HOMEPAGE_BLOG_POSTS_COUNT } from '../../constants';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { ServicesSection } from './sections/ServicesSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { TeamSection } from './sections/TeamSection';
import { WorkStatsSection } from './sections/WorkStatsSection';
import { BlogPromoSection } from './sections/BlogPromoSection';
import { SocialSection } from './sections/SocialSection';
import { FAQSection } from './sections/FAQSection';
import { ContactSection } from './sections/ContactSection';
import PROJECTS from '../../data/projects.json';
import PARTNERS from '../../data/partners.json';
import SERVICES from '../../data/services.json';

export default function HomePage() {
  const [blogPosts] = useState(() => loadBlogPosts().slice(0, HOMEPAGE_BLOG_POSTS_COUNT));

  useScrollAnimations();

  return (
    <>
      <SEO path="/" />
      <div className="page-wrapper home-page">
        <Navbar position="absolute" isHomePage={true} />
        <main className="main-wrapper">
          <HeroSection />

          <section
            id="partners"
            className="partners_wrap background-color-white padding-section-compact border-radius-top"
            data-animate-scope
            data-animate-trigger="scroll"
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="50"
          >
            <Marquee
              items={PARTNERS.clients}
              renderItem={(c, index) => (
                <span
                  className="partners_logo_wrap"
                  data-animate="fade-up"
                  data-animate-order={index}
                >
                  <img
                    src={c.logoSmall || c.logo}
                    alt={c.name}
                    className="partners_logo"
                    loading="lazy"
                  />
                </span>
              )}
              getItemKey={c => c.slug}
              repetitions={4}
              outerClassName="partners_marquee-outer"
              trackClassName="partners_marquee-track"
              setClassName="partners_marquee-set"
            />

            <div
              className="partners_contain container padding-global"
              data-animate="fade-up"
              data-animate-order="1"
              style={{
                paddingTop: '2rem',
                paddingBottom: '2.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <AppLink to="/partners" className="text-button text-button--align-end meet-up-align">
                <div className="text-button_list is-dark">
                  <div className="text-button_text">View partners</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated is-dark">
                  <div className="text-button_text meet-text">Who trusts us</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
              </AppLink>
            </div>

            <SectionDivider variant="default" hideOnMobile={false} />
          </section>

          <AboutSection />

          <div
            className="section_infinity background-color-gray overflow-hidden"
            data-animate-scope
            data-animate-default-preset="fade-up"
          >
            <Marquee repetitions={2} trackClassName="infinity_list">
              <p className="infinity_text" data-animate="fade-up">
                {SERVICES.infinityBand.map(service => (
                  <span className="infinity_item" key={service}>
                    <span className="infinity_label">{service}</span>
                    <span className="infinity_dot" aria-hidden="true">
                      •
                    </span>
                  </span>
                ))}
              </p>
            </Marquee>
          </div>

          <ServicesSection />
          <ProjectsSection projects={PROJECTS} />
          <TestimonialsSection />
          <WorkStatsSection />
          <TeamSection />
          <BlogPromoSection blogPosts={blogPosts} />
          <SocialSection />
          <FAQSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
      <EmailCaptureForm />
    </>
  );
}
