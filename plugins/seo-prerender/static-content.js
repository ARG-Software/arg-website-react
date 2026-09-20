import { NAV_LINKS } from './constants.js';
import { escapeHtml } from './html-utils.js';
import { getHeadingId } from '../../src/frontend/utils/blog/articleHelpers.js';
import { parseInlineMarkdown } from '../../src/frontend/utils/inlineMarkdown.js';

const EXTERNAL_HREF_PATTERN = /^https?:\/\//i;

export function injectStaticContent(html, content) {
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}

export function buildBlogPostStaticContent(meta, blocks) {
  const heroImageIndex = blocks.findIndex(block => block.type === 'image');
  const heroImage = heroImageIndex >= 0 ? blocks[heroImageIndex] : null;
  const articleBlocks = blocks.filter((_, index) => index !== heroImageIndex);
  const headerMeta = [
    meta.date,
    meta.reviewedOn ? `Reviewed on ${meta.reviewedOn}` : '',
    meta.readTime,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' · ');
  const author = escapeHtml(meta.author || 'ARG Software');
  const authorLink = meta.authorUrl
    ? `<a href="${escapeHtml(meta.authorUrl)}" rel="author noopener noreferrer">${author}</a>`
    : author;

  return `<div class="page-wrapper" data-prerendered-content>
  <main class="main-wrapper">
    <header class="bp-article-page-header">
      <h1>${escapeHtml(meta.title || meta.slug)}</h1>
      ${meta.subtitle ? `<p>${escapeHtml(meta.subtitle)}</p>` : ''}
      <p>${headerMeta}${headerMeta ? ' · ' : ''}${authorLink}</p>
    </header>
    <section class="bp-body background-color-white padding-section-large border-radius-all">
      <div class="bp-body-inner container container--section padding-global">
        <article class="bp-content">
          ${heroImage ? renderImage(heroImage, 'bp-hero-figure') : ''}
          ${articleBlocks.map(renderBlogBlock).join('\n          ')}
        </article>
      </div>
    </section>
    ${renderNavigation([{ href: '/blog/', label: 'Blog' }])}
  </main>
</div>`;
}

export function buildProjectStaticContent(project, projectLinks = []) {
  const services = project.services.map(service => `<li>${escapeHtml(service)}</li>`).join('');
  const solution = project.solution.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const metrics = project.metrics
    .map(
      metric =>
        `<li><strong>${escapeHtml(`${metric.displayValue || metric.value}${metric.suffix || ''}`)}</strong> ${escapeHtml(metric.label)}</li>`
    )
    .join('');
  const challenge = project.challenge
    .split('\n\n')
    .map(paragraph => `<p class="prp-section-text">${renderInlineText(paragraph)}</p>`)
    .join('');

  return `<div class="prp-page" data-prerendered-content>
  <main>
    <section class="prp-intro padding-section-large">
      <div class="prp-grid-container">
        <h1 class="prp-intro-title">${escapeHtml(project.title)}</h1>
        <p class="prp-intro-subtitle">${escapeHtml(project.intro)}</p>
        ${project.description ? `<p class="prp-intro-description">${renderInlineText(project.description)}</p>` : ''}
        <dl>
          <dt>Category</dt><dd>${escapeHtml(project.subtitle)}</dd>
          <dt>Client</dt><dd>${escapeHtml(project.client)}</dd>
          <dt>Featured engagement</dt><dd>${escapeHtml(project.timeline)}</dd>
          <dt>Technology</dt><dd>${escapeHtml(project.stack)}</dd>
        </dl>
        <h2>Services</h2>
        <ul>${services}</ul>
      </div>
    </section>
    <section class="prp-challenge padding-section-large">
      <div class="prp-grid-container">
        <h2 class="prp-section-heading">What had to be solved</h2>
        ${challenge}
      </div>
    </section>
    <section class="prp-solution padding-section-large">
      <div class="prp-grid-container">
        <h2 class="prp-solution-heading">How we made it work</h2>
        <ul class="prp-solution-list">${solution}</ul>
      </div>
    </section>
    <section class="prp-results padding-section-large">
      <div class="prp-grid-container">
        <h2 class="prp-results-heading">Results</h2>
        <p class="prp-results-text">${renderInlineText(project.impact)}</p>
        <ul class="prp-results-cards">${metrics}</ul>
      </div>
    </section>
    ${renderNavigation(projectLinks)}
  </main>
</div>`;
}

function renderBlogBlock(block) {
  switch (block.type) {
    case 'lead':
      return `<p class="bp-lead">${renderInlineText(block.text)}</p>`;
    case 'paragraph':
      return `<p class="bp-p">${renderInlineText(block.text)}</p>`;
    case 'heading':
      return `<h2 id="${getHeadingId(block.text)}" class="bp-h2">${escapeHtml(block.text)}</h2>`;
    case 'subheading':
      return `<h3 id="${getHeadingId(block.text)}" class="bp-h3">${escapeHtml(block.text)}</h3>`;
    case 'ordered-list':
      return renderList(block.items, 'ol', 'bp-list bp-list--ordered');
    case 'list':
      return renderList(block.items, 'ul', 'bp-list');
    case 'callout':
      return `<blockquote class="bp-callout">${renderInlineText(block.text)}</blockquote>`;
    case 'code':
      return `<pre class="bp-code-pre"><code>${escapeHtml(block.text)}</code></pre>`;
    case 'image':
      return renderImage(block, 'bp-figure');
    default:
      return '';
  }
}

function renderList(items, tag, className) {
  const listItems = items
    .map(item => {
      const label = item.label
        ? `<span class="bp-list-label">${renderInlineText(item.label)}</span> `
        : '';
      return `<li class="bp-list-item">${label}${renderInlineText(item.text)}</li>`;
    })
    .join('');
  return `<${tag} class="${className}">${listItems}</${tag}>`;
}

function renderImage(image, className) {
  const caption = image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : '';
  return `<figure class="${className}"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || '')}" class="bp-image" loading="lazy">${caption}</figure>`;
}

function renderInlineText(text) {
  return renderInlineParts(parseInlineMarkdown(text));
}

function renderInlineParts(parts) {
  return parts
    .map(part => {
      if (part.type === 'link') {
        const externalAttributes = EXTERNAL_HREF_PATTERN.test(part.href)
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
        return `<a href="${escapeHtml(part.href)}"${externalAttributes}>${renderInlineParts(part.parts)}</a>`;
      }
      if (part.type === 'strong') return `<strong>${renderInlineParts(part.parts)}</strong>`;
      if (part.type === 'code') {
        return `<code class="inline-markdown-code">${escapeHtml(part.text)}</code>`;
      }
      return escapeHtml(part.text);
    })
    .join('');
}

function renderNavigation(extraLinks) {
  const links = [...NAV_LINKS, ...extraLinks]
    .map(link => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
    .join('\n      ');
  return `<nav aria-label="Site navigation">
      ${links}
    </nav>`;
}
