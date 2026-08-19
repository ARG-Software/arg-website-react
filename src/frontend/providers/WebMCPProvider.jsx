import { useEffect } from 'react';

const TOOL_SCHEMAS = {
  empty: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  project: {
    type: 'object',
    required: ['slug'],
    additionalProperties: false,
    properties: {
      slug: {
        type: 'string',
        description: 'Project slug, for example mojaloop or peoples-clearinghouse.',
      },
    },
  },
};

export function WebMCPProvider() {
  useEffect(() => {
    const modelContext = navigator?.modelContext;
    if (!modelContext?.registerTool && !modelContext?.provideContext) return undefined;

    const controller = new AbortController();

    loadPublicDiscoveryTools()
      .then(tools => {
        if (controller.signal.aborted) return;

        if (typeof modelContext.registerTool === 'function') {
          tools.forEach(tool => modelContext.registerTool(tool, { signal: controller.signal }));
          return;
        }

        modelContext.provideContext({ tools }, { signal: controller.signal });
      })
      .catch(() => {
        // WebMCP is progressive enhancement only; never affect the visible site.
      });

    return () => controller.abort();
  }, []);

  return null;
}

async function loadPublicDiscoveryTools() {
  const [projectsModule, siteLinksModule, homePageModule] = await Promise.all([
    import('@data/projects.json'),
    import('@data/siteLinks.json'),
    import('@data/homePage.json'),
  ]);

  const projects = projectsModule.default;
  const siteLinks = siteLinksModule.default;
  const homePage = homePageModule.default;
  const services = homePage.services.details.map(service => ({
    name: service.heading,
    tags: service.tags,
    description: service.content,
  }));

  return [
    {
      name: 'get_company_profile',
      description: 'Return public profile information for ARG Software.',
      inputSchema: TOOL_SCHEMAS.empty,
      execute: () => ({
        name: 'ARG Software',
        website: 'https://arg.software/',
        summary:
          'ARG Software is a Portugal-based software studio building secure, scalable digital platforms for fintech, open payments, music technology, media, web3, SaaS, and high-growth technology companies.',
        locations: ['Funchal, Portugal', 'Porto, Portugal'],
        services: services.map(service => service.name),
      }),
    },
    {
      name: 'list_services',
      description: 'List ARG Software public service areas.',
      inputSchema: TOOL_SCHEMAS.empty,
      execute: () => ({ services }),
    },
    {
      name: 'list_projects',
      description: 'List ARG Software public project case studies.',
      inputSchema: TOOL_SCHEMAS.empty,
      execute: () => ({
        projects: projects.map(project => ({
          slug: project.slug,
          title: project.title,
          category: project.subtitle,
          url: `https://arg.software/projects/${project.slug}/`,
          intro: project.intro,
        })),
      }),
    },
    {
      name: 'get_project',
      description: 'Return one ARG Software public project case study by slug.',
      inputSchema: TOOL_SCHEMAS.project,
      execute: ({ slug }) => {
        const project = projects.find(item => item.slug === slug);

        if (!project) {
          return { error: 'Unknown project slug' };
        }

        return {
          slug: project.slug,
          title: project.title,
          category: project.subtitle,
          client: project.client,
          timeline: project.timeline,
          services: project.services,
          url: `https://arg.software/projects/${project.slug}/`,
          intro: project.intro,
          description: project.description,
          impact: project.impact,
          stack: project.stack,
        };
      },
    },
    {
      name: 'get_blog_discovery',
      description: 'Return blog discovery URLs for feeds, sitemap, and markdown access.',
      inputSchema: TOOL_SCHEMAS.empty,
      execute: () => ({
        index: 'https://arg.software/blog/',
        rss: 'https://arg.software/rss.xml',
        atom: 'https://arg.software/atom.xml',
        sitemap: 'https://arg.software/sitemap.xml',
        note: 'Use RSS or Atom for the complete current article list. Blog pages also support Accept: text/markdown.',
      }),
    },
    {
      name: 'get_contact_options',
      description: 'Return public ARG Software contact, project, and social links.',
      inputSchema: TOOL_SCHEMAS.empty,
      execute: () => ({
        email: siteLinks.emails.hello,
        contactPage: 'https://arg.software/contact/',
        projectBrief: 'https://arg.software/contact/#brief',
        booking: siteLinks.calendar.project,
        portfolio: `https://arg.software${siteLinks.assets.portfolio}`,
        socials: siteLinks.socials,
      }),
    },
    {
      name: 'get_llm_context',
      description: 'Return public LLM context document URLs for ARG Software.',
      inputSchema: TOOL_SCHEMAS.empty,
      execute: () => ({
        summary: 'https://arg.software/llms.txt',
        full: 'https://arg.software/llms-full.txt',
      }),
    },
  ];
}
