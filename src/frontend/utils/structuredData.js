import {
  DEFAULT_AUTHOR,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
} from '../constants/seo.js';
import { toContentDateIso } from './contentDate.js';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function absoluteUrl(url) {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function splitSameAs(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return undefined;
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

const JOSE_ID = `${SITE_URL}/#person-jose-antunes`;
const RUI_ID = `${SITE_URL}/#person-rui-rocha`;

const FOUNDER_IDS = {
  'José Antunes': JOSE_ID,
  'Rui Rocha': RUI_ID,
};

const ORGANIZATION_OFFERS = [
  'Dedicated Product Teams',
  'Senior Team Extension',
  'Technical Consulting',
  'MVP + Product Delivery',
  'AI Integration',
  'Cloud + Platform Engineering',
];

function buildAuthorSchema({ name, url, type, sameAs } = {}) {
  const authorName = name || DEFAULT_AUTHOR.name;
  const isDefaultAuthor = authorName === DEFAULT_AUTHOR.name;
  const founderId = FOUNDER_IDS[authorName];

  return {
    '@type': type || (isDefaultAuthor ? DEFAULT_AUTHOR.type : 'Person'),
    '@id': isDefaultAuthor ? ORGANIZATION_ID : founderId,
    name: authorName,
    url: absoluteUrl(url || (isDefaultAuthor ? DEFAULT_AUTHOR.url : undefined)),
    sameAs: splitSameAs(sameAs) || (isDefaultAuthor ? DEFAULT_AUTHOR.sameAs : undefined),
  };
}

function removeEmptyValues(value) {
  if (Array.isArray(value)) {
    return value.map(removeEmptyValues).filter(item => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, removeEmptyValues(item)])
        .filter(([, item]) => item !== undefined && item !== '')
    );
  }

  return value ?? undefined;
}

export function normalizeJsonLd(jsonLd) {
  if (!jsonLd) return [];
  return (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean);
}

export function stringifyJsonLd(schema) {
  return JSON.stringify(removeEmptyValues(schema)).replace(/</g, '\\u003c');
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: DEFAULT_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icons/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: DEFAULT_OG_IMAGE,
    address: [
      {
        '@type': 'PostalAddress',
        addressLocality: 'Porto',
        addressCountry: 'PT',
      },
      {
        '@type': 'PostalAddress',
        addressLocality: 'Funchal',
        addressCountry: 'PT',
      },
    ],
    email: 'hello@arg.software',
    foundingDate: '2020',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'hello@arg.software',
      url: `${SITE_URL}/contact/`,
    },
    sameAs: [
      'https://www.linkedin.com/company/arg-software',
      'https://github.com/ARG-Software',
      'https://medium.com/@arg-software',
    ],
    founder: [
      {
        '@type': 'Person',
        '@id': JOSE_ID,
        name: 'José Antunes',
        jobTitle: 'Co-founder and Software Engineer',
        sameAs: 'https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/',
      },
      {
        '@type': 'Person',
        '@id': RUI_ID,
        name: 'Rui Rocha',
        jobTitle: 'Co-founder and Software Engineer',
        sameAs: 'https://www.linkedin.com/in/ruirochawork/',
      },
    ],
    makesOffer: ORGANIZATION_OFFERS.map(name => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name,
        provider: { '@id': ORGANIZATION_ID },
      },
    })),
    knowsAbout: [
      'Software Architecture',
      'Backend Engineering',
      'Distributed Systems',
      'Scalable Systems',
      'Production Software',
      'Product Engineering',
      'SaaS Development',
      'Dedicated Product Teams',
      'Senior Team Extension',
      'Technical Consulting',
      'MVP Development',
      'AI Integration',
      'Cloud Platform Engineering',
      'Fintech',
      'Music Technology',
    ],
    areaServed: 'Worldwide',
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: 'en',
    author: buildAuthorSchema(),
    publisher: {
      '@id': ORGANIZATION_ID,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildWebPageSchema({ title, description, path = '/', image, type } = {}) {
  const pageUrl = `${SITE_URL}${path || '/'}`;

  return {
    '@context': 'https://schema.org',
    '@type': type || 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: title || DEFAULT_TITLE,
    description: description || DEFAULT_DESCRIPTION,
    inLanguage: 'en',
    isPartOf: {
      '@id': WEBSITE_ID,
    },
    author: buildAuthorSchema(),
    publisher: {
      '@id': ORGANIZATION_ID,
    },
    primaryImageOfPage: image
      ? {
          '@type': 'ImageObject',
          url: absoluteUrl(image),
        }
      : undefined,
  };
}

export function buildBreadcrumbListSchema(breadcrumbs) {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) return null;

  const items = breadcrumbs.filter(item => (item.name || item.label) && (item.path || item.href));
  if (items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name || item.label,
      item: absoluteUrl(item.path || item.href),
    })),
  };
}

export function buildGlobalSchemas() {
  return [buildOrganizationSchema(), buildWebsiteSchema()];
}

export function buildFAQPageSchema(faqItems) {
  const mainEntity = faqItems
    .filter(item => item.q && item.schemaAnswer)
    .map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.schemaAnswer,
      },
    }));

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

export function buildArticleSchema(post) {
  const datePublished = toContentDateIso(post.date) || undefined;
  const dateModified = toContentDateIso(post.dateModified || post.updated) || datePublished;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.subtitle,
    datePublished,
    image: absoluteUrl(post.image),
    dateModified,
    author: buildAuthorSchema({
      name: post.author,
      url: post.authorUrl,
      type: post.authorType,
      sameAs: post.authorSameAs,
    }),
    publisher: {
      '@id': ORGANIZATION_ID,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}/`,
    },
  };
}

export function buildProjectSchema(project) {
  const projectUrl = `${SITE_URL}/projects/${project.slug}/`;
  const stackItems =
    project.stack
      ?.split(',')
      .map(item => item.trim())
      .filter(Boolean) ?? [];

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${projectUrl}#case-study`,
    name: `${project.title} Use Case`,
    description: project.intro || project.description || project.challenge,
    url: projectUrl,
    image: absoluteUrl(project.imgSrc),
    creator: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': projectUrl,
    },
    about: [
      project.subtitle ? { '@type': 'Thing', name: project.subtitle } : null,
      ...stackItems.map(name => ({ '@type': 'Thing', name })),
    ].filter(Boolean),
    keywords: stackItems,
  };
}

export function buildPageSchemas(jsonLd, { includeGlobal = true, page, breadcrumbs } = {}) {
  return [
    ...(includeGlobal ? buildGlobalSchemas() : []),
    page ? buildWebPageSchema(page) : null,
    buildBreadcrumbListSchema(breadcrumbs),
    ...normalizeJsonLd(jsonLd),
  ].filter(Boolean);
}

export function renderJsonLdScripts(jsonLd, options) {
  return buildPageSchemas(jsonLd, options)
    .map(
      schema =>
        `<script data-rh="true" type="application/ld+json">${stringifyJsonLd(schema)}</script>`
    )
    .join('\n  ');
}
