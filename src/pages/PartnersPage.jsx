import { useEffect } from 'react';
import { useScrollAnimations, usePageTransition } from '../hooks';
import { Navbar, Footer, CTASection, SectionDivider, PartnerRow, SEO } from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { toSlug } from '../utils/helpers';
import '../styles/partners.css';

export default function PartnersPage() {
  const { scrollToHash } = usePageTransition();
  useScrollAnimations(); // Scroll animations including footer

  // Handle hash fragments on page load (e.g., /partners#partner-name)
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        scrollToHash(hash, { mobileMenuDelay: 0 });
      }
    }
  }, [scrollToHash]);

  const PARTNERS = [
    {
      name: 'Interledger Foundation',
      logo: 'images/group-203112.svg',
      industry: 'Fintech & Open Payments',
      description:
        'A global nonprofit building an open, interoperable payment network through the Interledger Protocol — enabling seamless, currency-agnostic transactions that bring digital financial services to the 1.4 billion people currently excluded from traditional banking.',
      link: 'https://interledger.org/',
    },
    {
      name: "People's Clearinghouse",
      logo: 'images/group-123132-402x.svg',
      industry: 'Financial Inclusion',
      description:
        'A social sector technology platform servicing community banks and credit unions in rural Mexico. Working with AMUCSS and the Interledger Foundation, it is building cross-border remittance infrastructure to connect 140 community banks to the global payments network — reducing fees and wait times for migrant families.',
      link: 'https://lacamara.mx/',
    },
    {
      name: 'ThreeSigma',
      logo: 'images/group-203127-402x.webp',
      industry: 'Blockchain & Web3',
      description:
        'A research-driven investment and advisory firm focused on blockchain ecosystems and decentralised finance, supporting crypto-native projects with deep technical and market expertise.',
      link: 'https://threesigma.xyz/',
    },
    {
      name: 'Mojaloop Foundation',
      logo: 'images/mojaloop-foundation-orange-402x.png',
      industry: 'Fintech & Open Source',
      description:
        'An open-source foundation championing inclusive financial infrastructure. Mojaloop builds interoperable payment systems that bring affordable, accessible digital financial services to unbanked populations worldwide.',
      link: 'https://mojaloop.io/',
    },
    {
      name: 'Hostelier',
      logo: 'images/group-203134-402x.png',
      industry: 'Tourism & Hospitality',
      description:
        'A hospitality management platform that helps property owners and tourism businesses streamline their operations — from bookings and scheduling to guest communication and day-to-day management.',
      link: 'https://hostelier.weebly.com/',
    },
    {
      name: 'mb-netzwerk',
      logo: 'images/group-203128-402x.png',
      industry: 'Digital Consultancy',
      description:
        'A German digital consultancy specialising in software solutions for tax documentation and business process automation, with a strong focus on GDPR compliance and enterprise-grade reliability.',
      link: 'https://www.dokutar.de/',
    },
    {
      name: 'SEFA',
      logo: 'images/group-203133-402x.svg',
      industry: 'Foodservice Industry',
      description:
        'A nationwide network in the foodservice industry that connects supply and equipment dealers with manufacturers, providing collective buying power, marketing support, and training services to strengthen market presence and business operations.',
      link: 'https://www.sefa.com/',
    },
    {
      name: 'Angry Ventures',
      logo: 'images/av-20logo-20medium-402x.png',
      industry: 'Venture Studio',
      description:
        'A hands-on venture studio that conceives, builds, and scales digital products — blending product strategy, design, and engineering to take ideas from zero to market.',
      link: 'https://angry.ventures/',
    },
    {
      name: 'SkyTracks',
      logo: 'images/group-203159-402x.svg',
      industry: 'Music Tech',
      description:
        'A cloud-based music production platform enabling real-time collaboration between musicians, producers, and audio engineers — anywhere in the world, with professional-grade tools built directly into the browser.',
      link: 'https://skytracks.io/',
    },
    {
      name: 'North Music Group',
      logo: 'images/group-203132-402x.png',
      industry: 'Music Rights',
      description:
        'A music rights management company providing modern tools for catalogue management, royalty tracking, and licensing — making music ownership transparent and efficient for artists and publishers alike.',
      link: 'https://www.northmusicgroup.com/',
    },
  ];

  return (
    <>
      <SEO
        title="Our Partners"
        description="Meet the companies and organizations Arg Software partners with to deliver exceptional digital solutions across fintech, open payments, and financial inclusion."
        path="/partners"
      />
      <div className="page-wrapper w-clearfix pp-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          {/* HERO */}
          <SubpageHero title={['They trusted us.', "It's your time now."]} />

          {/* INTRO */}
          <section className="tp-intro-section background-color-white">
            <div
              className="pp-partners-inner"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}
            >
              <div className="tp-intro-center">
                <h2 className="tp-intro-heading">
                  <div className="heading_line">
                    <span className="tp-intro-line text-color-gradiant">We're selective.</span>
                  </div>
                  <div className="heading_line">
                    <span className="tp-intro-line">So are they.</span>
                  </div>
                </h2>
              </div>
            </div>
          </section>

          {/* PARTNERS */}
          <section className="pp-partners-section background-color-white">
            <div className="pp-partners-inner">
              {PARTNERS.map((p, i) => (
                <PartnerRow
                  key={i}
                  name={p.name}
                  slug={toSlug(p.name)}
                  description={p.description}
                  image={p.logo}
                  tag={p.industry}
                  link={p.link}
                  flip={i % 2 === 1}
                  index={i}
                />
              ))}
            </div>
          </section>

          <div className="page-cta-wrapper">
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
    </>
  );
}
