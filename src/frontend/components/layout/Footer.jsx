import { Footer as UiFooter } from '@ui/layout/Footer.jsx';
import { trackEvent, trackSocial } from '@services/analytics';
import { MarkNameWhite } from '../icons/MarkNameWhite';
import AppLink from '../navigation/AppLink';
import SITE from '../../data/site.json';
import MENU from '../../data/menu.json';
import {
  EMAIL_KEYS,
  getAiResearchLink,
  getCompanySocialLinks,
  getEmailAddress,
  getMailtoLink,
} from '../../services/linksService';

// Same grouping as the nav menu: big links first, then its columns
const NAV_COLUMNS = [{ label: 'Navigate', items: MENU.primary }, ...MENU.groups].map(group => ({
  title: group.label,
  items: group.items.map(item => ({ label: item.label, path: item.to })),
}));

export function Footer({ animate = true, animationPreset = 'fade-up', animationStagger = 80 }) {
  const socialLinks = getCompanySocialLinks();
  const contactEmail = getEmailAddress(EMAIL_KEYS.INFO);
  const columns = buildFooterColumns(socialLinks);

  return (
    <UiFooter
      brand={{
        logo: <MarkNameWhite />,
        tagline: SITE.footer.tagline,
        contact: (
          <>
            Porto and Funchal, Portugal ·{' '}
            <a href={getMailtoLink(EMAIL_KEYS.INFO)}>{contactEmail}</a>
          </>
        ),
        actionsTitle: SITE.footer.askAi.title,
        actions: buildFooterAiActions(),
      }}
      columns={columns}
      legalLinks={[
        { label: 'Privacy Policy', href: '/privacy/' },
        { label: 'Terms of Service', href: '/terms/' },
      ]}
      copyright="© 2020-2026 ARG Software. All rights reserved."
      renderLink={renderFooterAppLink}
      renderExternalLink={renderFooterExternalLink}
      animate={animate}
      animationPreset={animationPreset}
      animationStagger={animationStagger}
    />
  );
}

function buildFooterColumns(socialLinks) {
  return [
    ...NAV_COLUMNS,
    {
      title: 'Services',
      items: SITE.footer.services.map(item => ({ label: item })),
    },
    {
      title: 'Socials',
      items: socialLinks.map(link => ({ ...link, className: 'footer-socials__link' })),
    },
  ];
}

function buildFooterAiActions() {
  const askAi = SITE.footer.askAi;
  return askAi.providers.map(provider => ({
    key: `ai-research-${provider.provider}`,
    href: getAiResearchLink(provider.provider, askAi.prompt),
    provider: provider.provider,
    label: provider.label,
    title: `Ask ${provider.label} about ARG Software`,
    ariaLabel: `Ask ${provider.label} about ARG Software`,
    className: 'footer-ai-link',
    html: (
      <span
        className={`footer-ai-link__mark footer-ai-link__mark--${provider.provider}`}
        aria-hidden="true"
      >
        {provider.mark}
      </span>
    ),
  }));
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
  if (item.provider) {
    return (
      <a
        key={item.key}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={item.ariaLabel}
        title={item.title}
        onClick={() =>
          trackEvent('ai_research_click', {
            provider: item.provider,
            link_location: 'footer',
          })
        }
      >
        {children}
      </a>
    );
  }

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
