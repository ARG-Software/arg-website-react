import { useState, useCallback } from 'react';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA, trackEvent } from '../hooks/useAnalytics';
import {
  Navbar,
  Footer,
  CTASection,
  SectionDivider,
  SEO,
  Drawer,
  FilterGrid,
  Timeline,
  PageHeader,
} from '../components';
import data from '../data/partners.json';
import { getProjectBookingLink, getProjectBriefFormLink } from '../services/externalLinks';
import '../styles/partners.css';

const { categories, clients } = data;

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
        title="Partners"
        description="Meet the companies Arg Software has partnered with across fintech, open payments, music technology, Web3, consultancy, and industry platforms."
        path="/partners/"
      />
      <div className="page-wrapper pp-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={['Trusted by the teams', 'building what matters.']}
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Partners' }]}
            sideItems={[
              { label: 'Partners', href: '#partners', meta: String(clients.length) },
              { label: 'Partnership timeline', href: '#timeline' },
              { label: 'Start a project', href: '#page-cta' },
            ]}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="partners"
              className="pc-clients-section padding-section-large background-color-white border-radius-all"
            >
              <div className="container padding-global pc-clients-inner">
                <div className="pc-header">
                  <div className="pc-header-main">
                    <div className="pc-filters">
                      {categories.map((cat, index) => (
                        <button
                          key={cat}
                          className={`pc-filter-btn${activeCategory === cat ? ' is-active' : ''}`}
                          onClick={() => handleCategoryChange(cat)}
                          data-animate-order={index}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pc-header-desc" data-animate-order={categories.length}>
                    <p>
                      ARG works with teams building payment rails, music platforms, venture-backed
                      products, and operational systems where reliability matters.
                    </p>
                  </div>
                </div>

                <FilterGrid
                  items={clients}
                  activeCategory={activeCategory}
                  getItemKey={c => c.slug}
                  isItemVisible={isClientVisible}
                  onItemClick={handleClientClick}
                  renderItem={c => <img src={c.logoSmall || c.logo} alt={c.name} loading="lazy" />}
                  animate={true}
                  preset="fade-up"
                  stagger={80}
                />
              </div>
            </section>

            <section id="timeline" className="pt-timeline-section padding-section-large">
              <Timeline
                heading="Built on lasting partnerships"
                clients={clients}
                ctaLink={getProjectBriefFormLink()}
                onCtaClick={() => trackCTA('typeform', 'partners_timeline')}
                animate={true}
                rowPreset="slide-from-left"
                cardPreset="fade-up"
                stagger={150}
              />
            </section>
          </div>

          <section className="page-cta-wrapper" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to build"
              titleHighlight="something that lasts?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="pp-animate"
              animate={true}
              buttonLink={getProjectBookingLink()}
              onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
            />
          </section>
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
