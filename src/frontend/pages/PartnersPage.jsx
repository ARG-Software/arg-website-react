import { useState, useCallback } from 'react';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@services/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { ContactSection } from '@components/layout/ContactSection';
import { SEO } from '@components/seo/SEO';
import { Drawer } from '@ui/overlays/Drawer.jsx';
import { ChoiceFilter } from '@ui/filters/ChoiceFilter.jsx';
import { FilterGrid } from '@ui/grids/FilterGrid.jsx';
import { Timeline } from '@ui/grids/Timeline.jsx';
import { PageHeader } from '@components/headers/PageHeader';
import AppLink from '@components/navigation/AppLink';
import data from '../data/partners.json';
import PARTNERS_PAGE from '../data/partnersPage.json';
import { getProjectBookingLink, getProjectBriefFormLink } from '../services/linksService';
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
        title={PARTNERS_PAGE.seo.title}
        description={PARTNERS_PAGE.seo.description}
        path="/partners/"
        breadcrumbs={PARTNERS_PAGE.hero.breadcrumbs}
      />
      <div className="page-wrapper pp-page">
        <Navbar position="absolute" isHomePage={true} />

        <main id="main" className="main-wrapper">
          <PageHeader
            title={PARTNERS_PAGE.hero.title}
            breadcrumbs={PARTNERS_PAGE.hero.breadcrumbs}
            sideItems={PARTNERS_PAGE.hero.sideItems.map((item, index) =>
              index === 0 ? { ...item, meta: String(clients.length) } : item
            )}
            size="small"
          />

          <div data-animate-scope data-animate-default-preset="fade-up">
            <section
              id="partners"
              className="pc-clients-section padding-section-large background-color-white border-radius-all"
            >
              <div className="container padding-global pc-clients-inner">
                <div className="pc-header">
                  <ChoiceFilter
                    className="pc-header-filters"
                    options={categories}
                    value={activeCategory}
                    onChange={handleCategoryChange}
                    label="Filter partners by category"
                    data-animate-order="1"
                  />
                  <div className="pc-header-desc" data-animate-order="0">
                    <p>{PARTNERS_PAGE.clients.intro}</p>
                  </div>
                </div>

                <FilterGrid
                  items={clients}
                  activeCategory={activeCategory}
                  getItemKey={c => c.slug}
                  isItemVisible={isClientVisible}
                  onItemClick={handleClientClick}
                  renderItem={c => (
                    <img
                      src={c.logoSmall || c.logo}
                      alt={c.name}
                      width={c.logoSize[0]}
                      height={c.logoSize[1]}
                      loading="lazy"
                    />
                  )}
                  animate={true}
                  preset="fade-up"
                />
              </div>
            </section>

            <section id="timeline" className="pt-timeline-section padding-section-large">
              <Timeline
                heading={PARTNERS_PAGE.timeline.heading}
                clients={clients}
                ctaLink={getProjectBriefFormLink()}
                onCtaClick={() => trackCTA('contact_brief', 'partners_timeline')}
                renderLink={({ href, children, ...props }) => (
                  <AppLink to={href} {...props}>
                    {children}
                  </AppLink>
                )}
                animate={true}
                cardPreset="fade-up"
              />
            </section>
          </div>

          <ContactSection
            id="page-cta"
            title={PARTNERS_PAGE.cta.title}
            titleHighlight={PARTNERS_PAGE.cta.titleHighlight}
            buttonTextNotHover={PARTNERS_PAGE.cta.buttonTextNotHover}
            buttonTextHover={PARTNERS_PAGE.cta.buttonTextHover}
            buttonLink={getProjectBookingLink()}
            onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
          />
        </main>

        <Footer />
      </div>

      <Drawer isOpen={!!selectedClient} onClose={handleCloseDrawer}>
        {selectedClient && (
          <div className="pc-drawer-content">
            <div className="pc-drawer-logo">
              <img
                src={selectedClient.logoSmall || selectedClient.logo}
                alt={selectedClient.name}
              />
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
                  <span>{PARTNERS_PAGE.drawer.visitLabel}</span>
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
