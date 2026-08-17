import type { RagSourceMetadata } from '../../../domain/content/RagSource.js';

interface ParsedMarkdown {
  frontmatter: RagSourceMetadata;
  body: string;
}

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  const normalizedMarkdown = markdown.replace(/\r\n?/g, '\n');
  const match = normalizedMarkdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: normalizedMarkdown };
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
