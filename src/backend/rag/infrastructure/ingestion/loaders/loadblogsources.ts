import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFrontmatter } from '../extractors/parsemarkdown.js';
import { stripMarkdown } from '../../../application/ingestion/processing/text.js';
import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IIngestionRunOptions } from '../../../application/ingestion/iingestion.types.js';
import type { IRagSource, RagSourceMetadata } from '../../../domain/sources/ragsource.types.js';
import { matchesFileSelection, resolveRoot } from './loaderfiles.js';

export async function loadBlogSources(
  rootDir: string,
  relativeFilePath: string,
  selection?: IIngestionRunOptions
): Promise<IRagSource[]> {
  const blogDir = resolveRoot(rootDir, relativeFilePath);
  const entries = await readdir(blogDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(blogDir, entry.name))
    .filter(filePath => matchesFileSelection(filePath, selection))
    .sort();

  return Promise.all(markdownFiles.map(loadMarkdownSource));
}

async function loadMarkdownSource(filePath: string): Promise<IRagSource> {
  const { frontmatter, body } = parseFrontmatter(await readFile(filePath, 'utf8'));
  const slug = getFrontmatterString(frontmatter, 'slug');
  const fallbackName = path.basename(filePath, path.extname(filePath));
  const title = getFrontmatterString(frontmatter, 'title') ?? fallbackName;
  const subtitle = getFrontmatterString(frontmatter, 'subtitle') ?? getFrontmatterString(frontmatter, 'intro') ?? '';
  const published = getFrontmatterString(frontmatter, 'date') ?? '';
  const topic = getFrontmatterString(frontmatter, 'tag') ?? '';

  return createSource({
    sourceType: 'blog_post',
    sourceKey: slug ?? fallbackName,
    title,
    url: slug ? `/blog/${slug}/` : undefined,
    path: filePath,
    metadata: frontmatter,
    content: [
      'Blog post',
      `Title: ${title}`,
      `Subtitle: ${subtitle}`,
      `Published: ${published}`,
      `Topic: ${topic}`,
      '',
      stripMarkdown(body),
    ].join('\n'),
  });
}

function getFrontmatterString(frontmatter: RagSourceMetadata, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === 'string' ? value : undefined;
}
