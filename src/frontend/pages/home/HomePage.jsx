import { useState } from 'react';
import { loadBlogPostsMetadata } from '@utils/blog';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { SEO } from '@components/seo/SEO';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { ContactSection } from '@components/layout/ContactSection';
import { trackCTA } from '@services/analytics';
import { getPortfolioLink, getProjectBriefFormLink } from '../../services/linksService';
import { HOMEPAGE_BLOG_POSTS_COUNT } from '@constants/config';
import { buildFAQPageSchema } from '@utils/structuredData';
import { HeroSection } from './sections/HeroSection';
import { PartnersSection } from './sections/PartnersSection';
import { StudioOverviewSection } from './sections/StudioOverviewSection';
import { ServicesMarqueeSection } from './sections/ServicesMarqueeSection';
import { ServicesSection } from './sections/ServicesSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { TeamSection } from './sections/TeamSection';
import { WorkStatsSection } from './sections/WorkStatsSection';
import { BlogPromoSection } from './sections/BlogPromoSection';
import { SocialSection } from './sections/SocialSection';
import { FAQSection } from './sections/FAQSection';

import PROJECTS from '../../data/projects.json';
import HOMEPAGE from '../../data/homePage.json';
import FAQ from '../../data/faq.json';

export default function HomePage() {
  const [blogPosts] = useState(() => loadBlogPostsMetadata().slice(0, HOMEPAGE_BLOG_POSTS_COUNT));

  useScrollAnimations();

  return (
    <>
      <SEO path="/" jsonLd={buildFAQPageSchema(FAQ.items)} />
      <div className="page-wrapper home-page">
        <Navbar position="absolute" isHomePage={true} />
        <main id="main" className="main-wrapper">
          <HeroSection content={HOMEPAGE.hero} />

          <PartnersSection />
          <StudioOverviewSection />
          <ServicesMarqueeSection />
          <ServicesSection content={HOMEPAGE.services} />
          <ProjectsSection projects={PROJECTS} content={HOMEPAGE.projects} />
          <TestimonialsSection testimonials={HOMEPAGE.testimonials} />
          <WorkStatsSection content={HOMEPAGE.workStats} />
          <TeamSection content={HOMEPAGE.team} />
          <BlogPromoSection blogPosts={blogPosts} content={HOMEPAGE.blogPromo} />
          <SocialSection content={HOMEPAGE.social} />
          <FAQSection content={HOMEPAGE.faq} items={FAQ.items} />
          <ContactSection
            title={HOMEPAGE.contact.title}
            titleHighlight={HOMEPAGE.contact.titleHighlight}
            buttonTextNotHover={HOMEPAGE.contact.buttonTextNotHover}
            buttonTextHover={HOMEPAGE.contact.buttonTextHover}
            buttonLink={getPortfolioLink()}
            onPrimaryClick={() => trackCTA('portfolio', 'homepage_cta')}
            secondButtonTextNotHover={HOMEPAGE.contact.secondButtonTextNotHover}
            secondButtonTextHover={HOMEPAGE.contact.secondButtonTextHover}
            secondButtonLink={getProjectBriefFormLink()}
            onSecondaryClick={() => trackCTA('contact_brief', 'homepage_contact')}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
