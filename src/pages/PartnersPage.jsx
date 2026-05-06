import { useState, useCallback } from 'react';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackEvent } from '../hooks/useAnalytics';
import {
  Navbar,
  Footer,
  CTASection,
  SectionDivider,
  SEO,
  Drawer,
  FilterGrid,
  Timeline,
} from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import data from '../data/partners.json';
import '../styles/partners.css';

const { categories, clients, timeline } = data;
const clientMap = Object.fromEntries(clients.map(c => [c.slug, c]));

export default function PartnersPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedClient, setSelectedClient] = useState(null);

  useTimeOnPage('/partners/');
  useScrollAnimations();

  const handleCategoryChange = useCallback(cat => {
    setActiveCategory(cat);
    trackEvent('partner_filter_click', { category: cat });
  }, []);

  const handleClientClick = useCallback(client => {
    setSelectedClient(client);
    trackEvent('partner_drawer_open', { client: client.name, category: client.category });
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedClient(null);
  }, []);

  const isClientVisible = useCallback(
    client => activeCategory === 'All' || client.category === activeCategory,
    [activeCategory]
  );

  return (
    <>
      <SEO
        title="Our Partners"
        description="Meet the companies and organizations Arg Software partners with to deliver exceptional digital solutions across fintech, open payments, and financial inclusion."
        path="/partners/"
      />
      <div className="page-wrapper w-clearfix pp-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <SubpageHero title={['They trusted us.', "It's your time now."]} size="small" />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section className="pc-clients-section padding-section-large background-color-white border-radius-top">
              <div className="container padding-global pc-clients-inner">
                <div className="pc-header" data-animate="fade-up">
                  <div className="pc-header-main">
                    <div className="pc-filters">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          className={`pc-filter-btn${activeCategory === cat ? ' is-active' : ''}`}
                          onClick={() => handleCategoryChange(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pc-header-desc">
                    <p>
                      ARG is proud to work with companies that have sustainable impact goals and
                      share our passion for technical excellence and innovation.
                    </p>
                  </div>
                </div>

                <FilterGrid
                  items={clients}
                  activeCategory={activeCategory}
                  getItemKey={c => c.slug}
                  isItemVisible={isClientVisible}
                  onItemClick={handleClientClick}
                  renderItem={c => <img src={c.logoSmall} alt={c.name} loading="lazy" />}
                  animate={true}
                  preset="fade-up"
                  stagger={80}
                />
              </div>
            </section>

            <Timeline
              heading="Built on lasting partnerships"
              rows={timeline.rows}
              yearStart={timeline.yearStart}
              yearEnd={timeline.yearEnd}
              items={clientMap}
              ctaLink="https://5ppw8e4ewzu.typeform.com/to/O5kXHIiC"
              ctaAnalyticsEvent="typeform"
              ctaAnalyticsLabel="partners_timeline"
              animate={true}
              rowPreset="slide-from-left"
              cardPreset="fade-up"
              stagger={150}
            />
          </div>

          <div className="page-cta-wrapper" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to elevate"
              titleHighlight="your digital experience?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="pp-animate"
              buttonLink="https://zcal.co/argsoftware/project"
            />
          </div>
        </main>

        <Footer />
      </div>

      <Drawer isOpen={!!selectedClient} onClose={handleCloseDrawer}>
        {selectedClient && (
          <div className="pc-drawer-content">
            <div className="pc-drawer-logo">
              <img src={selectedClient.logo} alt={selectedClient.name} />
            </div>
            <div className="pc-drawer-info">
              <div className="pc-drawer-header">
                <h3 className="pc-drawer-name">{selectedClient.name}</h3>
                <span className="pc-drawer-industry">{selectedClient.industry}</span>
              </div>
              <p className="pc-drawer-desc">{selectedClient.description}</p>
              {selectedClient.link && (
                <a
                  href={selectedClient.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pc-drawer-link-arrow"
                  onClick={() =>
                    trackEvent('partner_outbound_click', {
                      client: selectedClient.name,
                      url: selectedClient.link,
                    })
                  }
                >
                  <span>Visit website</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 17"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.77734 8.5L13.3329 8.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="square"
                    />
                    <path
                      d="M9.11133 3.83203L13.778 8.4987L9.11133 13.1654"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="square"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
