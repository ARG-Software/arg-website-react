import sourcesConfigJson from '../config/sources.json' with { type: 'json' };

export interface IHomepageSectionScope {
  sourceKey: string;
  dataKey: string;
  title: string;
}

interface IProjectReferenceConfig {
  slug: string;
  name: string;
  aliases?: string[];
}

interface ISourcesConfig {
  homepageSectionScopes: Record<string, IHomepageSectionScope>;
  staticPageSourceKeys: Record<string, string[]>;
  projects: IProjectReferenceConfig[];
}

const sourcesConfig = sourcesConfigJson as ISourcesConfig;

export const HOMEPAGE_SECTION_SCOPES = sourcesConfig.homepageSectionScopes;
export type HomepageSectionId = keyof typeof HOMEPAGE_SECTION_SCOPES;
export const HOMEPAGE_SECTION_IDS = Object.keys(HOMEPAGE_SECTION_SCOPES) as HomepageSectionId[];

export function getHomepageSectionScope(sectionId: string): IHomepageSectionScope | null {
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

