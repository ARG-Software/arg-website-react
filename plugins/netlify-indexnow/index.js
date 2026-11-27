// Netlify build plugin: tells IndexNow (Bing, Yandex, Seznam, Naver) which pages changed in a production deploy.
// Each sitemap page is hashed with its hashed asset names removed, so a rebuild alone changes nothing.
// The hashes of the last deploy live in the Netlify build cache; the first deploy without them submits every page.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE_URL = 'https://arg.software';
// IndexNow keys are public by design: search engines fetch `/{key}.txt` to check that submissions come from the site owner.
const KEY = 'ebfc920d6f351d31cccae70acc487671';
const HASHES_FILE = '.netlify-indexnow-hashes.json';

const changedUrls = [];

export const onPostBuild = async ({ constants, utils }) => {
  if (process.env.CONTEXT !== 'production') {
    console.log('[indexnow] Not a production deploy, skipping.');
    return;
  }

  const distDir = constants.PUBLISH_DIR;
  fs.writeFileSync(path.join(distDir, `${KEY}.txt`), KEY);

  await utils.cache.restore(HASHES_FILE);
  let previousHashes = {};
  if (fs.existsSync(HASHES_FILE)) {
    previousHashes = JSON.parse(fs.readFileSync(HASHES_FILE, 'utf-8'));
  }

  const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf-8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

  const hashes = {};
  for (const url of urls) {
    const htmlPath = path.join(distDir, new URL(url).pathname, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      continue;
    }

    const html = fs.readFileSync(htmlPath, 'utf-8').replace(/\/assets\/[^"'\s)]+/g, '/assets/');
    hashes[url] = crypto.createHash('sha256').update(html).digest('hex');
    if (hashes[url] !== previousHashes[url]) {
      changedUrls.push(url);
    }
  }

  fs.writeFileSync(HASHES_FILE, JSON.stringify(hashes));
  await utils.cache.save(HASHES_FILE);
  console.log(`[indexnow] ${changedUrls.length} of ${urls.length} pages changed.`);
};

// onSuccess runs once the deploy is live, so search engines fetch the new pages.
export const onSuccess = async () => {
  if (changedUrls.length === 0) {
    return;
  }

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList: changedUrls,
    }),
  });

  // A failed submission must not fail the deploy; the pages are still crawled through the sitemap.
  if (response.ok) {
    console.log(`[indexnow] Submitted ${changedUrls.length} URLs (HTTP ${response.status}).`);
  } else {
    console.warn(`[indexnow] Submission failed: HTTP ${response.status} ${await response.text()}`);
  }
};
