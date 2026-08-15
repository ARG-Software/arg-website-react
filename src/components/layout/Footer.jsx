import { Footer as UiFooter } from '@ui/layout/Footer.jsx';
import { trackSocial } from '../../utils/analytics';
import { MarkNameWhite } from '../icons/MarkNameWhite';
import AppLink from '../navigation/AppLink';
import SITE from '../../data/site.json';
import {
  EMAIL_KEYS,
  getCompanySocialLinks,
  getEmailAddress,
  getMailtoLink,
} from '../../services/linksService';

const NAV_LINKS = [
  { label: 'Blog', path: '/blog/' },
  { label: 'Careers', path: '/careers/' },
  { label: 'About Us', path: '/about-us/' },
  { label: 'Working with Us', path: '/working-with-us/' },
  { label: 'Contact', path: '/contact/' },
  { label: 'Partners', path: '/partners/' },
  { label: 'Use Cases', path: '/#cases' },
];

export function Footer({ animate = true, animationPreset = 'fade-up', animationStagger = 80 }) {
  const socialLinks = getCompanySocialLinks();
  const contactEmail = getEmailAddress(EMAIL_KEYS.INFO);
  const columns = buildFooterColumns(socialLinks, contactEmail);

  return (
    <UiFooter
      brand={{ logo: <MarkNameWhite />, tagline: SITE.footer.tagline }}
      columns={columns}
      legalLinks={[
        { label: 'Privacy Policy', href: '/privacy/' },
        { label: 'Terms of Service', href: '/terms/' },
      ]}
      copyright="© 2020-2026 Arg Software. All rights reserved."
      renderLink={renderFooterAppLink}
      renderExternalLink={renderFooterExternalLink}
      animate={animate}
      animationPreset={animationPreset}
      animationStagger={animationStagger}
    />
  );
}

function buildFooterColumns(socialLinks, contactEmail) {
  return [
    {
      title: 'Navigate',
      items: NAV_LINKS,
    },
    {
      title: 'Services',
      items: SITE.footer.services.map(item => ({ label: item })),
    },
    {
      title: 'Socials',
      items: socialLinks.map(link => ({ ...link, className: 'footer-socials__link' })),
    },
    {
      title: 'Contact',
      items: [
        { label: 'Porto and Funchal, Portugal' },
        {
          key: 'info-email',
          html: <a href={getMailtoLink(EMAIL_KEYS.INFO)}>{contactEmail}</a>,
        },
      ],
    },
  ];
}

function renderFooterAppLink({ item, className, children }) {
  return (
    <AppLink
      key={item.path}
      to={item.path}
      className={className}
      trackEvent="footer_nav_click"
      trackData={{ label: item.label, path: item.path }}
    >
      {children}
    </AppLink>
  );
}

function renderFooterExternalLink({ item, className, children }) {
  if (item.event) {
    return (
      <a
        key={item.event}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => trackSocial(item.event, 'footer')}
      >
        {children}
      </a>
    );
  }

  return (
    <a key={item.href} href={item.href} className={className}>
      {children}
    </a>
  );
}
