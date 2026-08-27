import type { Project, Service, ToolDefinition } from './types/mcpTypes.js';

export const SERVER_INFO = {
  name: 'ARG Software Public Discovery MCP',
  version: '1.0.0',
};

export const COMPANY_PROFILE = {
  name: 'ARG Software',
  website: 'https://arg.software/',
  summary:
    'ARG Software is a Portugal-based software studio building secure, scalable digital platforms for fintech, open payments, music technology, media, web3, SaaS, and high-growth technology companies.',
  locations: ['Funchal, Portugal', 'Porto, Portugal'],
  operatingModel:
    'Senior-led, architecture-first product engineering with direct engineering ownership and long-term maintainability focus.',
};

export const SERVICES: Service[] = [
  {
    name: 'Dedicated Product Teams',
    description:
      'Focused ARG teams that bring senior engineering, product thinking, architecture discipline, and delivery ownership to build, ship, and evolve software products.',
  },
  {
    name: 'Staff Augmentation',
    description:
      'Experienced engineers added to existing teams to increase delivery capacity, fill technical gaps, and move faster without lowering quality or ownership.',
  },
  {
    name: 'Technical Consulting',
    description:
      'Architecture reviews, scalability planning, modernization, delivery strategy, AI adoption, audits, and complex product or platform decisions.',
  },
  {
    name: 'MVP + Product Delivery',
    description:
      'Concept-to-launch delivery for product foundations that are built to learn, adapt, and grow after launch.',
  },
  {
    name: 'AI + Automation',
    description:
      'Practical AI and automation for product features, integrations, internal workflows, and developer tooling.',
  },
  {
    name: 'Cloud + Platform Engineering',
    description:
      'Cloud infrastructure, CI/CD, observability, deployments, environments, and platform practices for reliable software delivery.',
  },
];

export const PROJECTS: Project[] = [
  {
    slug: 'mojaloop',
    title: 'Mojaloop',
    category: 'Fintech',
    url: 'https://arg.software/projects/mojaloop/',
    summary:
      'Ground-up rebuild work for Mojaloop vNext, the open-source payment switch for interoperable, high-volume transactions across banks, wallets, payment providers, and financial institutions.',
  },
  {
    slug: 'peoples-clearinghouse',
    title: "People's Clearinghouse",
    category: 'Fintech & Financial Inclusion',
    url: 'https://arg.software/projects/peoples-clearinghouse/',
    summary:
      'Community-owned payment network work extending Mojaloop vNext into a bank-ready clearinghouse, mobile app, merchant payment flow, and high-throughput payment API foundation.',
  },
  {
    slug: 'dokutar',
    title: 'Dokutar',
    category: 'Compliance Tech',
    url: 'https://arg.software/projects/dokutar/',
    summary:
      'Backend redesign, database migration, multitenancy, and security reinforcement for a German compliance platform that had outgrown its original architecture.',
  },
  {
    slug: 'sky-tracks',
    title: 'Sky Tracks',
    category: 'Music Tech',
    url: 'https://arg.software/projects/sky-tracks/',
    summary:
      'Cloud music production platform rebuild with Angular frontend migration, lower-latency workflows, external instrument connectivity, and product stabilization.',
  },
  {
    slug: 'tv-cine',
    title: 'TV Cine',
    category: 'Media & Entertainment',
    url: 'https://arg.software/projects/tv-cine/',
    summary: 'Media and entertainment platform work for TV Cine.',
  },
  {
    slug: 'royalty-flush',
    title: 'Royalty Flush',
    category: 'Music Rights',
    url: 'https://arg.software/projects/royalty-flush/',
    summary: 'Music rights and royalty-processing platform work.',
  },
  {
    slug: 'vector',
    title: 'Vector',
    category: 'Web3 & Blockchain',
    url: 'https://arg.software/projects/vector/',
    summary: 'Web3 and blockchain infrastructure product work.',
  },
];

export const BLOG_DISCOVERY = {
  index: 'https://arg.software/blog/',
  rss: 'https://arg.software/rss.xml',
  atom: 'https://arg.software/atom.xml',
  sitemap: 'https://arg.software/sitemap.xml',
  note: 'Use the RSS or Atom feed for the complete current article list. Individual blog URLs also support markdown negotiation with Accept: text/markdown.',
};

export const CONTACT_OPTIONS = {
  email: 'hello@arg.software',
  contactPage: 'https://arg.software/contact/',
  projectBrief: 'https://arg.software/contact/#brief',
  portfolio: 'https://arg.software/files/portfolio.pdf',
  linkedin: 'https://www.linkedin.com/company/arg-software',
  github: 'https://github.com/ARG-Software',
  medium: 'https://medium.com/@arg-software',
};

export const LLM_CONTEXT = {
  summary: 'https://arg.software/llms.txt',
  full: 'https://arg.software/llms-full.txt',
};

const PROJECT_SLUGS = PROJECTS.map(project => project.slug);

export const TOOLS: ToolDefinition[] = [
  {
    name: 'get_company_profile',
    description: 'Return a public profile of ARG Software.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'list_services',
    description: 'List ARG Software public service areas.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'list_projects',
    description: 'List public ARG Software project case studies.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'get_project',
    description: 'Return one public ARG Software project case study by slug.',
    inputSchema: {
      type: 'object',
      required: ['slug'],
      additionalProperties: false,
      properties: {
        slug: { type: 'string', enum: PROJECT_SLUGS },
      },
    },
  },
  {
    name: 'get_blog_discovery',
    description: 'Return blog discovery URLs for article feeds, sitemap, and markdown access.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'get_contact_options',
    description: 'Return public ARG Software contact and social links.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'get_llm_context',
    description: 'Return public LLM context document URLs for ARG Software.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
];
