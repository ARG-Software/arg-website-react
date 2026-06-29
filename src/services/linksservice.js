import sitelinks from '../data/sitelinks.json';

export const EXTERNAL_LINK_KEYS = Object.freeze({
  PROJECT_BOOKING: 'calendar.project',
  NEWSLETTER_SUBSCRIBE: 'newsletter.subscribe',
  PROJECT_BRIEF_FORM: 'forms.projectBrief',
  WEB3_FORMS_ENDPOINT: 'forms.web3.endpoint',
  WEB3_FORMS_ACCESS_KEY: 'forms.web3.accessKey',
  PORTFOLIO: 'assets.portfolio',
  RSS_FEED: 'feeds.rss',
  ATOM_FEED: 'feeds.atom',
});

export const EMAIL_KEYS = Object.freeze({
  INFO: 'info',
  HELLO: 'hello',
  HR: 'hr',
  JOSE: 'jose',
  RUI: 'rui',
});

export const PERSON_KEYS = Object.freeze({
  JOSE: 'jose',
  RUI: 'rui',
});

export const SOCIAL_KEYS = Object.freeze({
  GITHUB: 'github',
  LINKEDIN: 'linkedin',
  MEDIUM: 'medium',
});

function readPath(path) {
  return path.split('.').reduce((value, segment) => value?.[segment], sitelinks);
}

function getRequiredValue(value, label) {
  if (!value) {
    throw new Error(`Missing external link: ${label}`);
  }

  return value;
}

export function getExternalLink(linkKey) {
  return getRequiredValue(readPath(linkKey), linkKey);
}

export function getProjectBookingLink() {
  return getExternalLink(EXTERNAL_LINK_KEYS.PROJECT_BOOKING);
}

export function getNewsletterSubscribeLink() {
  return getExternalLink(EXTERNAL_LINK_KEYS.NEWSLETTER_SUBSCRIBE);
}

export function getProjectBriefFormLink() {
  return getExternalLink(EXTERNAL_LINK_KEYS.PROJECT_BRIEF_FORM);
}

export function getWeb3FormsEndpoint() {
  return getExternalLink(EXTERNAL_LINK_KEYS.WEB3_FORMS_ENDPOINT);
}

export function getWeb3FormsAccessKey() {
  return getExternalLink(EXTERNAL_LINK_KEYS.WEB3_FORMS_ACCESS_KEY);
}

export function getPortfolioLink() {
  return getExternalLink(EXTERNAL_LINK_KEYS.PORTFOLIO);
}

export function getFeedLink(feedKey) {
  return getExternalLink(feedKey);
}

export function getEmailAddress(emailKey) {
  return getRequiredValue(sitelinks.emails[emailKey], `emails.${emailKey}`);
}

export function getMailtoLink(emailKey, subject) {
  const emailAddress = getEmailAddress(emailKey);
  if (!subject) return `mailto:${emailAddress}`;

  return `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`;
}

export function getPersonLinkedInLink(personKey) {
  return getRequiredValue(sitelinks.people[personKey]?.linkedin, `people.${personKey}.linkedin`);
}

export function getCompanySocialLink(socialKey) {
  return getRequiredValue(sitelinks.socials[socialKey], `socials.${socialKey}`);
}

export function getCompanySocialLinks() {
  return [
    { label: 'GitHub', href: getCompanySocialLink(SOCIAL_KEYS.GITHUB), event: SOCIAL_KEYS.GITHUB },
    {
      label: 'LinkedIn',
      href: getCompanySocialLink(SOCIAL_KEYS.LINKEDIN),
      event: SOCIAL_KEYS.LINKEDIN,
    },
    { label: 'Medium', href: getCompanySocialLink(SOCIAL_KEYS.MEDIUM), event: SOCIAL_KEYS.MEDIUM },
  ];
}

export function getLinkedInShareLink(url) {
  const shareUrl = new URL(getRequiredValue(sitelinks.share.linkedin, 'share.linkedin'));
  shareUrl.searchParams.set('url', url);
  return shareUrl.toString();
}

export function getBlueskyShareLink(title, url) {
  const shareUrl = new URL(getRequiredValue(sitelinks.share.bluesky, 'share.bluesky'));
  shareUrl.searchParams.set('text', `${title} ${url}`);
  return shareUrl.toString();
}

export function getTwitterShareLink(title, url) {
  const shareUrl = new URL(getRequiredValue(sitelinks.share.twitter, 'share.twitter'));
  shareUrl.searchParams.set('text', title);
  shareUrl.searchParams.set('url', url);
  return shareUrl.toString();
}
