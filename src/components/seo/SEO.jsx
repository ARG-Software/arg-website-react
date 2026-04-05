import { Helmet } from 'react-helmet-async';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
} from '../../constants';

/**
 * Reusable SEO component that injects per-page meta tags via react-helmet-async.
 *
 * @param {object}  props
 * @param {string}  [props.title]         – Page title (will be appended with " | Arg Software" unless noSuffix)
 * @param {string}  [props.description]   – Page meta description
 * @param {string}  [props.path]          – Path portion of the URL, e.g. "/articles"
 * @param {string}  [props.image]         – Absolute or relative URL for the OG image
 * @param {string}  [props.type]          – OG type (default "website", use "article" for blog posts)
 * @param {boolean} [props.noSuffix]      – If true, don't append " | Arg Software" to the title
 * @param {string}  [props.publishedTime] – ISO 8601 date for articles
 * @param {string}  [props.author]        – Author name for articles
 * @param {string}  [props.section]       – Article section/category
 * @param {object}  [props.jsonLd]        – JSON-LD structured data object
 */
export function SEO({
  title,
  description,
  path = '',
  image,
  type = 'website',
  noSuffix = false,
  publishedTime,
  author,
  section,
  jsonLd,
}) {
  const pageTitle = title ? (noSuffix ? title : `${title} | Arg Software`) : DEFAULT_TITLE;

  const pageDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = `${SITE_URL}${path}`;

  // Ensure image is absolute
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`
    : DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      {/* Primary */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title || DEFAULT_TITLE} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@argsoftware" />
      <meta name="twitter:title" content={title || DEFAULT_TITLE} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Article-specific (only rendered when type=article) */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && author && <meta property="article:author" content={author} />}
      {type === 'article' && section && <meta property="article:section" content={section} />}

      {/* JSON-LD Structured Data */}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
