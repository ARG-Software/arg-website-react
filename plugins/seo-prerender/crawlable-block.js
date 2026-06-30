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
  return `<div aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">
  <h2>${escapeHtml(h1Text)}</h2>${descHtml}${subHtml}${paraHtml}
  <nav>
    ${navHtml}
  </nav>
</div>`;
}

export function injectCrawlableBlock(html, block) {
  return html.replace('<div id="root"></div>', `<div id="root"></div>\n${block}`);
}
