import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { stripMarkdown } from '../processing/text.js';

export async function loadMarkdownSource(filePath) {
  const markdown = await readFile(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(markdown);

  return {
    sourceType: 'blog_post',
    sourceKey: frontmatter.slug ?? path.basename(filePath, path.extname(filePath)),
    title: frontmatter.title ?? path.basename(filePath, path.extname(filePath)),
    url: frontmatter.slug ? `/blog/${frontmatter.slug}/` : undefined,
    path: filePath,
    metadata: frontmatter,
    content: stripMarkdown(body),
  };
}

export function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  return {
    frontmatter: parseYamlSubset(match[1]),
    body: match[2],
  };
}

function parseYamlSubset(value) {
  return value.split('\n').reduce((frontmatter, line) => {
    const match = line.match(/^([^:#]+):\s*(.*)$/);

    if (!match) {
      return frontmatter;
    }

    const key = match[1].trim();
    const rawValue = match[2].trim();
    frontmatter[key] = rawValue.replace(/^['"]|['"]$/g, '');
    return frontmatter;
  }, {});
}
