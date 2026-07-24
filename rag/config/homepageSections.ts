export const HOMEPAGE_SECTION_SCOPES = {
  hero: { sourceKey: 'home:hero', dataKey: 'hero', title: 'Homepage Hero' },
  partners: { sourceKey: 'home:partners', dataKey: 'partners', title: 'Homepage Partners' },
  overview: { sourceKey: 'home:overview', dataKey: 'overview', title: 'Homepage Overview' },
  services: { sourceKey: 'home:services', dataKey: 'services', title: 'ARG Services' },
  cases: { sourceKey: 'home:projects', dataKey: 'projects', title: 'Homepage Projects' },
  testimonials: { sourceKey: 'home:testimonials', dataKey: 'testimonials', title: 'Client Testimonials' },
  'working-with-us': { sourceKey: 'home:work', dataKey: 'workStats', title: 'Working With ARG' },
  team: { sourceKey: 'home:team', dataKey: 'team', title: 'ARG Team' },
  'blog-promo': { sourceKey: 'home:blog', dataKey: 'blogPromo', title: 'Homepage Blog' },
  social: { sourceKey: 'home:social', dataKey: 'social', title: 'Homepage Social' },
  faq: { sourceKey: 'home:faq', dataKey: 'faq', title: 'Homepage FAQ' },
  contact: { sourceKey: 'home:contact', dataKey: 'contact', title: 'Homepage Contact' },
} as const;

export type HomepageSectionId = keyof typeof HOMEPAGE_SECTION_SCOPES;

export const HOMEPAGE_SECTION_IDS = Object.keys(HOMEPAGE_SECTION_SCOPES) as HomepageSectionId[];

export function getHomepageSectionScope(sectionId: string) {
  return HOMEPAGE_SECTION_SCOPES[sectionId as HomepageSectionId] ?? null;
}
