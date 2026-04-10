import { useState } from 'react';
import { loadBlogPosts } from '../../utils/blog';
import { useScrollAnimations, useHeroAnimation } from '../../hooks';
import { SEO, Navbar, Footer, EmailCapture } from '../../components';
import { HOMEPAGE_BLOG_POSTS_COUNT } from '../../constants';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { InfinityMarquee } from './sections/InfinityMarquee';
import { ServicesSection } from './sections/ServicesSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { PartnersMarquee } from './sections/PartnersMarquee';
import { TeamSection } from './sections/TeamSection';
import { WorkStatsSection } from './sections/WorkStatsSection';
import { BlogPromoSection } from './sections/BlogPromoSection';
import { SocialSection } from './sections/SocialSection';
import { FAQSection } from './sections/FAQSection';
import { ContactSection } from './sections/ContactSection';

export default function HomePage() {
  const [blogPosts] = useState(() => loadBlogPosts().slice(0, HOMEPAGE_BLOG_POSTS_COUNT));

  useHeroAnimation(); // Hero section animations

  useScrollAnimations(); // Unified scroll-triggered animations for all sections

  return (
    <>
      <SEO path="/" />
      <div className="page-wrapper w-clearfix home-page">
        <Navbar position="absolute" isHomePage={true} />
        <main className="main-wrapper">
          <HeroSection />
          <PartnersMarquee />
          <AboutSection />
          <InfinityMarquee />
          <ServicesSection />
          <ProjectsSection />
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
      <EmailCapture />
    </>
  );
}
