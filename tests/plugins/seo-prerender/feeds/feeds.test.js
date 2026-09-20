import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateSitemap } from '../../../../plugins/seo-prerender/feeds/sitemap.js';
import { generateAtom } from '../../../../plugins/seo-prerender/feeds/rss.js';

test('sitemap uses dateModified for blog lastmod', () => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arg-sitemap-'));

  generateSitemap({
    distDir,
    blogPostMetas: [
      {
        slug: 'reviewed-post',
        date: 'June 10, 2026',
        dateModified: 'September 19, 2026',
      },
    ],
  });

  const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /<loc>https:\/\/arg\.software\/blog\/reviewed-post\/<\/loc>\n    <lastmod>2026-09-19<\/lastmod>/);
});

test('atom uses dateModified for entry updated timestamp', () => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arg-atom-'));

  generateAtom({
    distDir,
    blogPostMetas: [
      {
        slug: 'reviewed-post',
        title: 'Reviewed Post',
        subtitle: 'A reviewed article.',
        date: 'June 10, 2026',
        dateModified: 'September 19, 2026',
      },
    ],
  });

  const atom = fs.readFileSync(path.join(distDir, 'atom.xml'), 'utf8');
  assert.match(atom, /<updated>2026-09-19T00:00:00\.000Z<\/updated>/);
});
