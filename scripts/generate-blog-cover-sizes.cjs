const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const contentPaths = require('../src/frontend/data/contentPaths.json');

const BLOG_DIR = path.resolve(contentPaths.blog);
const PUBLIC_DIR = path.resolve('public');
const MANIFEST_PATH = path.resolve('src/frontend/data/blogCoverSizes.json');
const WIDTHS = [480, 960, 1600];
const FRONTMATTER_IMAGE_PATTERN = /^image:\s*['"]?([^'"\r\n]+)/m;
const FIRST_IMAGE_PATTERN = /!\[[^\]]*\]\(([^)\s]+)/;

async function main() {
  const manifest = {};
  let created = 0;

  for (const file of fs
    .readdirSync(BLOG_DIR)
    .filter(name => name.endsWith('.md'))
    .sort()) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const cover = (raw.match(FRONTMATTER_IMAGE_PATTERN) || raw.match(FIRST_IMAGE_PATTERN) || [])[1];
    if (!cover || !cover.startsWith('/images/blog/') || !cover.endsWith('.webp')) continue;

    const coverPath = path.join(PUBLIC_DIR, cover);
    if (!fs.existsSync(coverPath)) continue;

    const { width } = await sharp(coverPath).metadata();
    const widths = WIDTHS.filter(size => size < width);

    for (const size of widths) {
      const sizePath = coverPath.replace(/\.webp$/, `-${size}.webp`);
      if (fs.existsSync(sizePath)) continue;
      await sharp(coverPath).resize({ width: size }).webp({ quality: 80 }).toFile(sizePath);
      created++;
    }

    manifest[cover] = [...widths, width];
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${Object.keys(manifest).length} covers, ${created} new files`);
}

main();
