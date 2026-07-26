import { ASSISTANT_POLICY_SOURCE } from './assistantPolicy.js';

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

export const LOCAL_SOURCE_ENTRIES = [
  {
    kind: 'json',
    filePath: 'src/data/homepage.json',
    sourceType: 'homepage',
    sourceKey: 'homepage',
    title: 'Homepage',
    url: '/',
    label: 'homepage',
  },
  {
    kind: 'json',
    filePath: 'src/data/about.json',
    sourceType: 'about',
    sourceKey: 'about',
    title: 'About ARG Software',
    url: '/about-us/',
    label: 'about',
  },
  {
    kind: 'json',
    filePath: 'src/data/partnersPage.json',
    sourceType: 'partner',
    sourceKey: 'partners-page',
    title: 'Partners Page',
    url: '/partners/',
    label: 'partners page',
  },
  {
    kind: 'json',
    filePath: 'src/data/jobs.json',
    sourceType: 'careers',
    sourceKey: 'jobs',
    title: 'Jobs and Hiring Traits',
    url: '/careers/',
    label: 'jobs',
  },
  {
    kind: 'json',
    filePath: 'src/data/careersPage.json',
    sourceType: 'careers',
    sourceKey: 'careers-page',
    title: 'Careers Page',
    url: '/careers/',
    label: 'careers page',
  },
  {
    kind: 'json',
    filePath: 'src/data/workingWithUs.json',
    sourceType: 'working_with_us',
    sourceKey: 'working-with-us',
    title: 'Working With Us',
    url: '/working-with-us/',
    label: 'working with us',
  },
  {
    kind: 'json',
    filePath: 'src/data/faq.json',
    sourceType: 'faq',
    sourceKey: 'faq',
    title: 'Frequently Asked Questions',
    url: '/#faq',
    label: 'faq',
  },
  ASSISTANT_POLICY_SOURCE,
  {
    kind: 'projects_json',
    filePath: 'src/data/projects.json',
  },
  {
    kind: 'partners_json',
    filePath: 'src/data/partners.json',
  },
  {
    kind: 'markdown_dir',
    filePath: 'src/blog',
  },
  {
    kind: 'local_document',
    format: 'pdf',
    filePath: 'public/files/portfolio.pdf',
    sourceKey: 'portfolio-pdf',
    title: 'ARG Software Portfolio',
    citationUrl: '/files/portfolio.pdf',
    documentKind: 'portfolio',
  },
  {
    kind: 'local_document',
    format: 'pdf',
    filePath: 'rag/.rag_private/cvs/Jose_Francisco_Antunes_ATS_CV_2026.pdf',
    sourceKey: 'jose-antunes-cv',
    title: 'José Antunes',
    citationUrl: '/about-us/',
    documentKind: 'cv',
    personKey: 'jose',
    redaction: {
      profile: 'cv',
      manualReview: true,
    },
  },
  {
    kind: 'local_document',
    format: 'pdf',
    filePath: 'rag/.rag_private/cvs/Rui_Rocha_ATS_CV_2026.pdf',
    sourceKey: 'rui-rocha-cv',
    title: 'Rui Rocha',
    citationUrl: '/about-us/',
    documentKind: 'cv',
    personKey: 'rui',
    redaction: {
      profile: 'cv',
      manualReview: true,
    },
  },
] as const;

export function getHomepageSectionScope(sectionId: string) {
  return HOMEPAGE_SECTION_SCOPES[sectionId as HomepageSectionId] ?? null;
}
