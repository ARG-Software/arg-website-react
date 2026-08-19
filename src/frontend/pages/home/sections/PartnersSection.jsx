import AppLink from '../../../components/navigation/AppLink';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { Marquee } from '@ui/layout/Marquee.jsx';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import HOMEPAGE from '../../../data/homePage.json';
import PARTNERS from '../../../data/partners.json';

export function PartnersSection({
  className = '',
  content = HOMEPAGE.partners,
  clients = PARTNERS.clients,
}) {
  return (
    <section
      id="partners"
      className={`partners_wrap background-color-white padding-section-compact border-radius-top ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-preset="fade-up"
      data-animate-default-stagger="50"
    >
      <Marquee
        items={clients}
        renderItem={(client, index) => (
          <span className="partners_logo_wrap" data-animate="fade-up" data-animate-order={index}>
            <img
              src={client.logoSmall || client.logo}
              alt={client.name}
              className="partners_logo"
              loading="lazy"
            />
          </span>
        )}
        getItemKey={client => client.slug}
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
        <AppLink to="/partners/" className="text-button text-button--align-end meet-up-align">
          <div className="text-button_list is-dark">
            <div className="text-button_text">{content.cta.label}</div>
            <div className="arrow_icon-embed">{arrowSvg}</div>
          </div>
          <div className="text-button_list is-animated is-dark">
            <div className="text-button_text meet-text">{content.cta.hoverLabel}</div>
            <div className="arrow_icon-embed">{arrowSvg}</div>
          </div>
        </AppLink>
      </div>

      <SectionDivider variant="default" hideOnMobile={false} />
    </section>
  );
}
