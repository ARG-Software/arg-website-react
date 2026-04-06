import { useEffect } from 'react';
import AppLink from '../../../components/links/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { useLenis } from '../../../hooks';
import { SectionDivider } from '../../../components/layout/SectionDivider';

const partnerLogos = [
  { src: 'images/group-203127-small.webp', alt: 'Three Sigma', name: 'ThreeSigma' },
  { src: 'images/group-203134-small.webp', alt: 'Hostelier', small: true, name: 'Hostelier' },
  { src: 'images/group-203128-small.webp', alt: 'Mb-Netzwerk', medium: true, name: 'mb-netzwerk' },
  { src: 'images/group-203133-402x.svg', alt: 'SEFA', name: 'SEFA' },
  { src: 'images/av-20logo-20medium-402x.webp', alt: 'Angry Ventures', name: 'Angry Ventures' },
  {
    src: 'images/group-123132-402x.svg',
    alt: "People's Clearinghouse",
    name: "People's Clearinghouse",
  },
  { src: 'images/group-203112.svg', alt: 'Interledger Foundation', name: 'Interledger Foundation' },
  { src: 'images/group-203159-402x.svg', alt: 'SkyTracks', name: 'SkyTracks' },
  { src: 'images/group-203132-small.webp', alt: 'North Music Group', name: 'North Music Group' },
  {
    src: 'images/mojaloop-foundation-orange-small.webp',
    alt: 'Mojaloop Foundation',
    name: 'Mojaloop Foundation',
  },
];

export function PartnersMarquee({ className = '' }) {
  const lenis = useLenis();

  // Partners marquee manual scroll detection (moved from useScrollAnimations)
  useEffect(() => {
    const marqueeOuter = document.querySelector('.partners_marquee-outer');
    if (!marqueeOuter) return;

    const check = () => {
      if (marqueeOuter.classList.contains('is-revealed')) return;

      const rect = marqueeOuter.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) {
        marqueeOuter.classList.add('is-revealed');
      }
    };

    check();
    requestAnimationFrame(check);
    setTimeout(check, 200);
    setTimeout(check, 600);
    setTimeout(check, 1200);

    const onScroll = () => {
      check();
      if (marqueeOuter.classList.contains('is-revealed')) {
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    if (lenis) {
      lenis.on('scroll', check);
    }

    // Cleanup
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (lenis) {
        lenis.off('scroll', check);
      }
    };
  }, [lenis]);

  return (
    <section
      id="partners-marquee"
      className={`partners_wrap background-color-white padding-section-compact ${className}`.trim()}
    >
      <div className="partners_marquee-outer">
        <div className="partners_marquee-track">
          {[0, 1, 2, 3].map(setIndex => (
            <div key={setIndex} className="partners_marquee-set">
              {partnerLogos.map((logo, i) => (
                <AppLink
                  key={i}
                  to="/partners"
                  className={`partners_logo_wrap${logo.small ? ' is-small' : ''}${logo.medium ? ' is-m-100' : ''}`}
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="partners_logo"
                    width={logo.small ? 100 : logo.medium ? 200 : 200}
                    height="120"
                    loading="lazy"
                  />
                </AppLink>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className="partners_contain container padding-global"
        style={{
          paddingTop: '2rem',
          paddingBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <AppLink to="/partners" className="text-button w-inline-block meet-up-align">
          <div className="text-button_list is-dark">
            <div className="text-button_text">See all partners</div>
            <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
          </div>
          <div className="text-button_list is-animated is-dark">
            <div className="text-button_text meet-text">Meet them</div>
            <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
          </div>
        </AppLink>
      </div>
      <SectionDivider variant="default" hideOnMobile={false} />
    </section>
  );
}
