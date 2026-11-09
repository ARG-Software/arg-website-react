import { NAV_LINKS } from './constants.js';
import { escapeHtml } from './html-utils.js';

export function buildCrawlableBlock(
  h1Text,
  { extraLinks = [], description = '', subtitle = '', paragraphs = [] } = {}
) {
  const allLinks = [...NAV_LINKS, ...extraLinks];
  const navHtml = allLinks
    .map(l => `<a href="${l.href}">${escapeHtml(l.label)}</a>`)
    .join('\n    ');
  const descHtml = description ? `\n  <p>${escapeHtml(description)}</p>` : '';
  const subHtml = subtitle ? `\n  <p>${escapeHtml(subtitle)}</p>` : '';
  const paraHtml = paragraphs.map(p => `\n  <p>${escapeHtml(p)}</p>`).join('');
  // Hidden until the app replaces it (see the prerendered-content style in index.html)
  return `<main data-prerendered-content>
  <h1>${escapeHtml(h1Text)}</h1>${descHtml}${subHtml}${paraHtml}
  <nav>
    ${navHtml}
  </nav>
</main>`;
}

export function injectCrawlableBlock(html, block) {
  // Inside #root so React replaces it on render, leaving only the app's own h1.
  return html.replace('<div id="root"></div>', () => `<div id="root">${block}</div>`);
}
