import { SectionDivider } from './SectionDivider';
import { trackSocial } from '../../hooks/useAnalytics';
import { MarkNameWhite } from '../icons/MarkNameWhite';
import AppLink from '../navigation/AppLink';
import SERVICES from '../../data/services.json';
import {
  EMAIL_KEYS,
  getCompanySocialLinks,
  getEmailAddress,
  getMailtoLink,
} from '../../services/externalLinks';

const NAV_LINKS = [
  { label: 'Blog', path: '/blog' },
  { label: 'Careers', path: '/careers' },
  { label: 'Working with Us', path: '/working-with-us' },
  { label: 'Contact', path: '/contact' },
  { label: 'Partners', path: '/partners' },
  { label: 'Use Cases', path: '/projects' },
];

export function Footer({ animate = true, animationPreset = 'fade-up', animationStagger = 80 }) {
  const socialLinks = getCompanySocialLinks();
  const contactEmail = getEmailAddress(EMAIL_KEYS.INFO);

  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': animationPreset,
        'data-animate-default-stagger': String(animationStagger),
      }
    : {};

  return (
    <>
      <SectionDivider
        variant="light"
        data-animate={animate ? 'divider-expander-show' : undefined}
      />

      <footer className="footer-main" {...scopeAttrs}>
        <div className="container padding-global">
          <div className="footer-wrapper">
            {/* Panel 1 — Logo centered */}
            <div className="footer-left" data-animate-order={animate ? '0' : undefined}>
              <div className="footer-left__logo">
                <MarkNameWhite />
              </div>
              <div className="footer-left__tagline">Architecture-First Software Studio</div>
            </div>

            {/* Panel 2 — Nav / Services / Contact / Social / CTA / Bottom */}
            <div className="footer-right">
              {/* 3-column row */}
              <div className="footer-nav-row" data-animate-order={animate ? '1' : undefined}>
                {/* Navigation */}
                <div className="footer-nav-col">
                  <div className="footer-col-title">Navigate</div>
                  <div className="footer-col-list">
                    {NAV_LINKS.map(link => (
                      <AppLink
                        key={link.path}
                        to={link.path}
                        className="footer-col-link"
                        trackEvent="footer_nav_click"
                        trackData={{ label: link.label, path: link.path }}
                      >
                        {link.label}
                      </AppLink>
                    ))}
                  </div>
                </div>

                {/* Services (text only) */}
                <div className="footer-nav-col">
                  <div className="footer-col-title">Services</div>
                  <div className="footer-col-list">
                    {SERVICES.services.map(item => (
                      <span key={item} className="footer-col-text">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Socials */}
                <div className="footer-nav-col">
                  <div className="footer-col-title">Socials</div>
                  <div className="footer-col-list">
                    {socialLinks.map(link => (
                      <a
                        key={link.event}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-socials__link"
                        onClick={() => trackSocial(link.event, 'footer')}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Contacts */}
                <div className="footer-nav-col">
                  <div className="footer-col-title">Contact</div>
                  <div className="footer-col-list">
                    <span className="footer-col-text">Porto and Funchal, Portugal</span>
                    <span className="footer-col-text">
                      <a href={getMailtoLink(EMAIL_KEYS.INFO)}>{contactEmail}</a>
                    </span>
                  </div>
                </div>
              </div>

              <SectionDivider
                variant="light"
                data-animate={animate ? 'divider-expander-show' : undefined}
                data-animate-order={animate ? '2' : undefined}
              />

              {/* Bottom bar */}
              <div className="footer-bottom" data-animate-order={animate ? '3' : undefined}>
                <a href="/privacy" className="footer-bottom__link">
                  Privacy Policy
                </a>
                <a href="/terms" className="footer-bottom__link">
                  Terms of Service
                </a>
                <span className="footer-bottom__copyright">
                  © 2020-2026 Arg Software. All rights reserved.
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
