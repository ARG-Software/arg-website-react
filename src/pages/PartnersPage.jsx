import { useState, useCallback } from 'react';
import { useScrollAnimations } from '../hooks';
import { Navbar, Footer, CTASection, SectionDivider, SEO, Drawer, FilterGrid, Timeline } from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { arrowSvg } from '../components/icons/SocialIcons';
import data from '../data/partners.json';
import '../styles/partners.css';

const { pageMeta, categories, clients, timeline } = data;
const clientMap = Object.fromEntries(clients.map(c => [c.slug, c]));

export default function PartnersPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedClient, setSelectedClient] = useState(null);

  useScrollAnimations();

  const handleCategoryChange = useCallback(cat => {
    setActiveCategory(cat);
  }, []);

  const handleClientClick = useCallback(client => {
    setSelectedClient(client);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedClient(null);
  }, []);

  const isClientVisible = useCallback(
    client => activeCategory === 'All' || client.category === activeCategory,
    [activeCategory],
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
          <SubpageHero
            title={pageMeta.heroTitle}
            subtitle={pageMeta.heroSubtitle}
            size="small"
          />

          <section className="pc-clients-section padding-section-large background-color-white border-radius-top">
            <div className="container padding-global pc-clients-inner">
              <div className="pc-header">
                <div className="pc-header-main">
                  <h2 className="pc-header-title">{pageMeta.sectionHeader.title}</h2>
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
                  <p>{pageMeta.sectionHeader.description}</p>
                </div>
              </div>

              <FilterGrid
                items={clients}
                activeCategory={activeCategory}
                getItemKey={c => c.slug}
                isItemVisible={isClientVisible}
                onItemClick={handleClientClick}
                renderItem={c => (
                  <img src={c.logoSmall} alt={c.name} loading="lazy" />
                )}
              />
            </div>
          </section>

          <div className="section-divider-wrapper">
            <SectionDivider variant="light" hideOnMobile={false} />
          </div>

          <Timeline
            heading={pageMeta.timelineHeading}
            rows={timeline.rows}
            yearStart={timeline.yearStart}
            yearEnd={timeline.yearEnd}
            items={clientMap}
          />

          <div className="page-cta-wrapper" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to elevate"
              titleHighlight="your digital experience?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="pp-animate"
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
                  className="text-button pc-drawer-arrow w-inline-block"
                >
                  <div className="text-button_list is-dark">
                    <div className="text-button_text">Visit website</div>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                  <div className="text-button_list is-animated is-dark">
                    <div className="text-button_text meet-text">Open site</div>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
