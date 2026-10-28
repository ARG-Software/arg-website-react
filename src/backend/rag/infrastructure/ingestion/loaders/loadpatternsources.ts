import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFrontmatter } from '../extractors/parsemarkdown.js';
import { stripMarkdown } from '../../../application/ingestion/processing/text.js';
import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IIngestionRunOptions } from '../../../application/ingestion/iingestion.types.js';
import type { IRagSource, RagSourceMetadata } from '../../../domain/sources/ragsource.types.js';
import type { IArticleRecommendation } from '../../../domain/answers/assistantanswer.types.js';
import { matchesFileSelection, resolveRoot } from './loaderfiles.js';

export async function loadPatternSources(
  rootDir: string,
  relativeFilePath: string,
  relativeBlogPath: string,
  selection?: IIngestionRunOptions
): Promise<IRagSource[]> {
  const patternFiles = (await listMarkdownFiles(resolveRoot(rootDir, relativeFilePath))).filter(
    filePath => matchesFileSelection(filePath, selection)
  );
  if (patternFiles.length === 0) {
    return [];
  }

  const postTitles = new Map<string, string>();
  for (const filePath of await listMarkdownFiles(resolveRoot(rootDir, relativeBlogPath))) {
    const { frontmatter } = parseFrontmatter(await readFile(filePath, 'utf8'));
    const slug = getFrontmatterString(frontmatter, 'slug');
    const title = getFrontmatterString(frontmatter, 'title');
    if (slug && title) {
      postTitles.set(slug, title);
    }
  }

  return Promise.all(patternFiles.map(filePath => loadPatternSource(filePath, postTitles)));
}

async function loadPatternSource(
  filePath: string,
  postTitles: Map<string, string>
): Promise<IRagSource> {
  const { frontmatter, body } = parseFrontmatter(await readFile(filePath, 'utf8'));
  const slug =
    getFrontmatterString(frontmatter, 'slug') ?? path.basename(filePath, path.extname(filePath));
  const title = getFrontmatterString(frontmatter, 'title') ?? slug;
  const relatedArticles: IArticleRecommendation[] = [];
  for (const postSlug of (getFrontmatterString(frontmatter, 'relatedPosts') ?? '').split(',')) {
    const postTitle = postTitles.get(postSlug.trim());
    if (postTitle) {
      relatedArticles.push({ title: postTitle, url: `/blog/${postSlug.trim()}/` });
    }
  }

  const header = [
    'Architecture pattern',
    `Title: ${title}`,
    `Category: ${getFrontmatterString(frontmatter, 'category') ?? ''}`,
    `Summary: ${getFrontmatterString(frontmatter, 'subtitle') ?? ''}`,
  ];
  if (relatedArticles.length > 0) {
    header.push(
      `Related ARG articles: ${relatedArticles.map(article => `${article.title} (${article.url})`).join('; ')}`
    );
  }

  return createSource({
    sourceType: 'homepage',
    sourceKey: `pattern-${slug}`,
    title,
    url: `/patterns/${slug}/`,
    path: filePath,
    metadata: { ...frontmatter, relatedArticles },
    content: [...header, '', stripMarkdown(body)].join('\n'),
  });
}

async function listMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(directory, entry.name))
    .sort();
}

function getFrontmatterString(frontmatter: RagSourceMetadata, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === 'string' ? value : undefined;
}
