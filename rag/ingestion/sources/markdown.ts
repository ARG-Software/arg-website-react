import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { RagSource, RagSourceMetadata } from '../../types/ingestion.js';
import { stripMarkdown } from '../processing/text.js';

interface ParsedMarkdown {
  frontmatter: RagSourceMetadata;
  body: string;
}

export async function loadMarkdownSource(filePath: string): Promise<RagSource> {
  const markdown = await readFile(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(markdown);

  return {
    sourceType: 'blog_post',
    sourceKey: getFrontmatterString(frontmatter, 'slug') ?? path.basename(filePath, path.extname(filePath)),
    title: getFrontmatterString(frontmatter, 'title') ?? path.basename(filePath, path.extname(filePath)),
    url: getFrontmatterString(frontmatter, 'slug')
      ? `/blog/${getFrontmatterString(frontmatter, 'slug')}/`
      : undefined,
    path: filePath,
    metadata: frontmatter,
    content: stripMarkdown(body),
  };
}

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  return {
    frontmatter: parseYamlSubset(match[1]),
    body: match[2],
  };
}

function parseYamlSubset(value: string): RagSourceMetadata {
  return value.split('\n').reduce<RagSourceMetadata>((frontmatter, line) => {
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

function getFrontmatterString(frontmatter: RagSourceMetadata, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === 'string' ? value : undefined;
}
