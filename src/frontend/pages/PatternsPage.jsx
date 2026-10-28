import { useState, useCallback, useMemo } from 'react';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@services/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import AppLink from '@components/navigation/AppLink';
import { loadPatterns } from '@utils/patternLoader';
import PATTERNS_PAGE from '../data/patternsPage.json';
import { getProjectBookingLink } from '../services/linksService';
import '../styles/skills.css';

const PATTERNS = loadPatterns();

export default function PatternsPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  useTimeOnPage('/patterns/');
  useScrollAnimations();

  const visiblePatterns = useMemo(
    () =>
      activeCategory === 'All'
        ? PATTERNS
        : PATTERNS.filter(pattern => pattern.category === activeCategory),
    [activeCategory]
  );

  const handleCategoryChange = useCallback(category => {
    setActiveCategory(category);
    trackEvent('pattern_filter_click', { category });
  }, []);

  return (
    <>
      <SEO
        title={PATTERNS_PAGE.seo.title}
        description={PATTERNS_PAGE.seo.description}
        path="/patterns/"
        pageType="CollectionPage"
        breadcrumbs={PATTERNS_PAGE.hero.breadcrumbs}
      />
      <div className="page-wrapper sk-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={PATTERNS_PAGE.hero.title}
            subtitle={PATTERNS_PAGE.hero.subtitle}
            breadcrumbs={PATTERNS_PAGE.hero.breadcrumbs}
            sideItems={PATTERNS_PAGE.hero.sideItems.map(item =>
              item.href === '#patterns' ? { ...item, meta: String(PATTERNS.length) } : item
            )}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="patterns"
              className="sk-section padding-section-large background-color-white border-radius-all"
            >
              <div className="container padding-global sk-inner">
                <div className="sk-header">
                  <div className="sk-filters">
                    {PATTERNS_PAGE.categories.map((category, index) => (
                      <button
                        key={category}
                        type="button"
                        className={`sk-filter-btn${activeCategory === category ? ' is-active' : ''}`}
                        onClick={() => handleCategoryChange(category)}
                        data-animate-order={index}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sk-grid">
                  {visiblePatterns.map((pattern, index) => (
                    <BaseCard
                      key={pattern.slug}
                      as={AppLink}
                      to={`/patterns/${pattern.slug}/`}
                      className="sk-card"
                      variant="light"
                      padding="xl"
                      animate={true}
                      animationOrder={index}
                      trackEvent="pattern_click"
                      trackData={{ pattern: pattern.slug, location: 'patterns_hub' }}
                    >
                      <span className="sk-card-category">{pattern.category}</span>
                      <h3>{pattern.title}</h3>
                      <p>{pattern.subtitle}</p>
                      <div className="sk-card-tags">
                        {pattern.tags.map(tag => (
                          <Pill key={tag} variant="outline" size="sm">
                            {tag}
                          </Pill>
                        ))}
                      </div>
                    </BaseCard>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title={PATTERNS_PAGE.cta.title}
              titleHighlight={PATTERNS_PAGE.cta.titleHighlight}
              mobileTitleHighlight={PATTERNS_PAGE.cta.mobileTitleHighlight}
              buttonTextNotHover={PATTERNS_PAGE.cta.buttonTextNotHover}
              buttonTextHover={PATTERNS_PAGE.cta.buttonTextHover}
              animationClass="sk-animate"
              animate={true}
              buttonLink={getProjectBookingLink()}
              onPrimaryClick={() => trackCTA('book_meeting', 'patterns_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
