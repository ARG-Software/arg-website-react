import { useState, useCallback, useMemo } from 'react';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent, trackOutbound } from '@services/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import AppLink from '@components/navigation/AppLink';
import data from '../data/skills.json';
import SKILLS_PAGE from '../data/skillsPage.json';
import { getProjectBookingLink } from '../services/linksService';
import '../styles/skills.css';

const { categories, skills } = data;

export default function SkillsPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  useTimeOnPage('/skills/');
  useScrollAnimations();

  const visibleSkills = useMemo(
    () =>
      activeCategory === 'All' ? skills : skills.filter(skill => skill.category === activeCategory),
    [activeCategory]
  );

  const handleCategoryChange = useCallback(category => {
    setActiveCategory(category);
    trackEvent('skill_filter_click', { category });
  }, []);

  return (
    <>
      <SEO
        title={SKILLS_PAGE.seo.title}
        description={SKILLS_PAGE.seo.description}
        path="/skills/"
        pageType="CollectionPage"
        breadcrumbs={SKILLS_PAGE.hero.breadcrumbs}
      />
      <div className="page-wrapper sk-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={SKILLS_PAGE.hero.title}
            subtitle={SKILLS_PAGE.hero.subtitle}
            breadcrumbs={SKILLS_PAGE.hero.breadcrumbs}
            sideItems={SKILLS_PAGE.hero.sideItems.map(item =>
              item.href === '#skills' ? { ...item, meta: String(skills.length) } : item
            )}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="agents"
              className="sk-agents-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global sk-inner">
                <div className="sk-agents">
                  <div className="sk-agents-main">
                    <p className="sk-agents-heading" data-animate="fade-up">
                      {SKILLS_PAGE.agents.heading}
                    </p>
                    <ul className="sk-agents-list">
                      {SKILLS_PAGE.agents.items.map(agent => (
                        <li key={agent.id}>
                          <a
                            className="sk-agent"
                            href={agent.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackOutbound(agent.href, agent.name, 'skills_agents')}
                          >
                            <span
                              className="sk-agent-logo"
                              style={{
                                WebkitMaskImage: `url(${agent.logo})`,
                                maskImage: `url(${agent.logo})`,
                              }}
                              aria-hidden="true"
                            />
                            <span className="sk-agent-name">{agent.name}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="sk-agents-brief" data-animate="fade-up">
                    <p>{SKILLS_PAGE.agents.brief}</p>
                  </div>
                </div>
              </div>
              <div className="padding-bottom padding-80-40"></div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="skills"
              className="sk-section padding-section-large background-color-white"
            >
              <div className="container padding-global sk-inner">
                <div className="sk-header">
                  <div className="sk-filters">
                    {categories.map((category, index) => (
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
                  {visibleSkills.map((skill, index) => (
                    <BaseCard
                      key={skill.slug}
                      as={AppLink}
                      to={`/skills/${skill.slug}/`}
                      className="sk-card"
                      variant="light"
                      padding="xl"
                      animate={true}
                      animationOrder={index}
                      trackEvent="skill_click"
                      trackData={{ skill: skill.slug, category: skill.category }}
                    >
                      <span className="sk-card-category">{skill.category}</span>
                      <h3>{skill.title}</h3>
                      <p>{skill.summary}</p>
                      <div className="sk-card-tags">
                        {skill.tags.map(tag => (
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
              title={SKILLS_PAGE.cta.title}
              titleHighlight={SKILLS_PAGE.cta.titleHighlight}
              mobileTitleHighlight={SKILLS_PAGE.cta.mobileTitleHighlight}
              buttonTextNotHover={SKILLS_PAGE.cta.buttonTextNotHover}
              buttonTextHover={SKILLS_PAGE.cta.buttonTextHover}
              animationClass="sk-animate"
              animate={true}
              buttonLink={getProjectBookingLink()}
              onPrimaryClick={() => trackCTA('book_meeting', 'skills_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
