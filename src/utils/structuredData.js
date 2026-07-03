import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '../constants/seo.js';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function absoluteUrl(url) {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Funchal and Porto',
      addressCountry: 'PT',
    },
    email: 'hello@arg.software',
    sameAs: [
      'https://www.linkedin.com/company/arg-software',
      'https://github.com/ARG-Software',
      'https://medium.com/@arg-software',
    ],
    founder: [
      {
        '@type': 'Person',
        name: 'Jose Antunes',
        jobTitle: 'Co-founder and software developer',
        sameAs: 'https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/',
      },
      {
        '@type': 'Person',
        name: 'Rui Rocha',
        jobTitle: 'Co-founder and software developer',
        sameAs: 'https://www.linkedin.com/in/ruirochawork/',
      },
    ],
    knowsAbout: [
      'Custom Software Development',
      'SaaS Development',
      'Server Infrastructure',
      'Prototyping',
      'AI',
      'MVP Development',
      'Backend Development',
      'Frontend Development',
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
  const timestamp = Date.parse(post.date || '');
  const datePublished = Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.subtitle,
    datePublished,
    image: absoluteUrl(post.image),
    author: {
      '@id': ORGANIZATION_ID,
    },
    publisher: {
      '@id': ORGANIZATION_ID,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}/`,
    },
  };
}

export function buildPageSchemas(jsonLd, { includeGlobal = true } = {}) {
  return [...(includeGlobal ? buildGlobalSchemas() : []), ...normalizeJsonLd(jsonLd)].filter(
    Boolean
  );
}

export function renderJsonLdScripts(jsonLd, options) {
  return buildPageSchemas(jsonLd, options)
    .map(
      schema =>
        `<script data-rh="true" type="application/ld+json">${stringifyJsonLd(schema)}</script>`
    )
    .join('\n  ');
}
