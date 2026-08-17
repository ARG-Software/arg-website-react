import { readFileSync } from 'node:fs';

export interface HomepageSectionScope {
  sourceKey: string;
  dataKey: string;
  title: string;
}

interface ProjectReferenceConfig {
  slug: string;
  name: string;
  aliases?: string[];
}

interface SourcesConfig {
  homepageSectionScopes: Record<string, HomepageSectionScope>;
  staticPageSourceKeys: Record<string, string[]>;
  projects: ProjectReferenceConfig[];
}

const sourcesConfig = readSourcesConfig();

export const HOMEPAGE_SECTION_SCOPES = sourcesConfig.homepageSectionScopes;
export type HomepageSectionId = keyof typeof HOMEPAGE_SECTION_SCOPES;
export const HOMEPAGE_SECTION_IDS = Object.keys(HOMEPAGE_SECTION_SCOPES) as HomepageSectionId[];

export function getHomepageSectionScope(sectionId: string): HomepageSectionScope | null {
  return HOMEPAGE_SECTION_SCOPES[sectionId] ?? null;
}

export function getStaticPageSourceKeys(pathname: string): string[] | undefined {
  return sourcesConfig.staticPageSourceKeys[pathname];
}

export function getProjectNameBySlug(slug: string): string | undefined {
  return sourcesConfig.projects.find(project => project.slug === slug)?.name;
}

export function getKnownProjectNames(): string[] {
  return sourcesConfig.projects.flatMap(project => [project.name, ...(project.aliases ?? [])]);
}

function readSourcesConfig(): SourcesConfig {
  return JSON.parse(readFileSync(new URL('../config/sources.json', import.meta.url), 'utf8')) as SourcesConfig;
}
