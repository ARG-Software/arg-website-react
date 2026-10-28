import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../constants.js';
import { replaceMetaTags, escapeHtml } from '../html-utils.js';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, writeSocialJpeg } from '../og-image.js';
import { buildBlogPostStaticContent, injectStaticContent } from '../static-content.js';
import { loadPatterns } from './patterns.js';
import { DEFAULT_AUTHOR } from '../../../src/frontend/constants/seo.js';
import { parseBlocks } from '../../../src/frontend/utils/blog/articleContent.js';
import { getRelatedPosts } from '../../../src/frontend/utils/blog/articleHelpers.js';
import { buildArticleSchema } from '../../../src/frontend/utils/structuredData.js';
import { toContentDateIso } from '../../../src/frontend/utils/contentDate.js';

export async function writeBlogPosts({ distDir, baseHtml, blogPostMetas, generated }) {
  const patterns = loadPatterns();
  // Frontmatter tags are a comma string; getRelatedPosts expects an array, as in the SPA.
  const relatedCandidates = blogPostMetas.map(post => ({
    ...post,
    tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : undefined,
  }));
  let count = generated;
  for (const meta of blogPostMetas) {
    const body = meta._body;

    let image = meta.image || '';
    if (!image) {
      const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (imgMatch) image = imgMatch[1];
    }

    const articleUrl = `${SITE_URL}/blog/${meta.slug}/`;
    const title = `${meta.seoTitle || meta.title || meta.slug} | ARG Software`;
    const description = meta.subtitle || '';
    const author = meta.author || DEFAULT_AUTHOR.name;
    const authorUrl = meta.authorUrl || DEFAULT_AUTHOR.url;

    let extra = '';
    const publishedIso = toContentDateIso(meta.date);
    if (publishedIso) {
      extra += `<meta property="article:published_time" content="${publishedIso}">\n  `;
    }
    const modifiedIso = toContentDateIso(meta.dateModified || meta.updated || meta.date);
    if (modifiedIso) {
      extra += `<meta property="article:modified_time" content="${modifiedIso}">\n  `;
    }
    extra += `<meta property="article:author" content="${escapeHtml(author)}">`;
    extra += `\n  <meta property="article:publisher" content="ARG Software">`;
    if (meta.tag) {
      extra += `\n  <meta property="article:section" content="${escapeHtml(meta.tag)}">`;
    }

    const socialImage = (await writeSocialJpeg(image, distDir)) || image;

    let html = replaceMetaTags(baseHtml, {
      title,
      socialTitle: meta.seoTitle || meta.title || meta.slug,
      description,
      url: articleUrl,
      image: socialImage,
      imageWidth: socialImage.endsWith('.jpg') ? String(OG_IMAGE_WIDTH) : undefined,
      imageHeight: socialImage.endsWith('.jpg') ? String(OG_IMAGE_HEIGHT) : undefined,
      imageType: socialImage.endsWith('.jpg') ? 'image/jpeg' : undefined,
      type: 'article',
      extra,
      author,
      authorUrl,
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog/' },
        { name: meta.title || meta.slug, path: `/blog/${meta.slug}/` },
      ],
      jsonLd: buildArticleSchema({ ...meta, author, authorUrl, image }),
    });

    const blocks = parseBlocks(body);
    const patternLinks = patterns
      .filter(pattern =>
        pattern.relatedPosts
          .split(',')
          .map(s => s.trim())
          .includes(meta.slug)
      )
      .map(pattern => `[${pattern.title}](/patterns/${pattern.slug}/)`);
    if (patternLinks.length > 0) {
      blocks.push({ type: 'paragraph', text: `Pattern reference: ${patternLinks.join(' · ')}` });
    }
    // Carousel posts plus the previous and next post, so every post gets crawlable inlinks.
    const index = blogPostMetas.indexOf(meta);
    const neighbours = [relatedCandidates[index - 1], relatedCandidates[index + 1]].filter(Boolean);
    const related = getRelatedPosts(relatedCandidates, relatedCandidates[index], 9);
    const relatedLinks = [...new Set([...related, ...neighbours])].map(post => ({
      href: `/blog/${post.slug}/`,
      label: post.seoTitle || post.title || post.slug,
    }));
    html = injectStaticContent(html, buildBlogPostStaticContent(meta, blocks, relatedLinks));

    const dir = path.join(distDir, 'blog', meta.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }
  return count;
}
