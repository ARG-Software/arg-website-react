import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { escapeHtml } from '../html-utils.js';

export function generateRss({ distDir, blogPostMetas }) {
  const rssItems = blogPostMetas
    .map(meta => {
      const itemUrl = `${SITE_URL}/blog/${meta.slug}/`;
      const pubDate = meta.date ? new Date(meta.date).toUTCString() : new Date().toUTCString();
      const desc = escapeHtml(meta.subtitle || '');
      const title = escapeHtml(meta.seoTitle || meta.title || meta.slug);
      return `    <item>
      <title>${title}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Arg Software Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Technical articles, engineering insights, and best practices from the Arg Software team.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(distDir, 'rss.xml'), rssXml);
}

export function generateAtom({ distDir, blogPostMetas }) {
  const atomEntries = blogPostMetas
    .map(meta => {
      const itemUrl = `${SITE_URL}/blog/${meta.slug}/`;
      const updated = meta.date ? new Date(meta.date).toISOString() : new Date().toISOString();
      const summary = escapeHtml(meta.subtitle || '');
      const title = escapeHtml(meta.seoTitle || meta.title || meta.slug);
      return `  <entry>
    <title>${title}</title>
    <link href="${itemUrl}" />
    <id>${itemUrl}</id>
    <updated>${updated}</updated>
    <summary>${summary}</summary>
  </entry>`;
    })
    .join('\n');

  const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Arg Software Blog</title>
  <link href="${SITE_URL}/blog/" />
  <link href="${SITE_URL}/atom.xml" rel="self" type="application/atom+xml" />
  <updated>${new Date().toISOString()}</updated>
  <id>${SITE_URL}/blog/</id>
  <author>
    <name>Arg Software</name>
  </author>
${atomEntries}
</feed>`;

  fs.writeFileSync(path.join(distDir, 'atom.xml'), atomXml);
}
