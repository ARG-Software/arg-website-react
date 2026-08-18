const SERVER_INFO = {
  name: 'ARG Software Public Discovery MCP',
  version: '1.0.0',
};

const SERVICES = [
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

const PROJECTS = [
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

const BLOG_DISCOVERY = {
  index: 'https://arg.software/blog/',
  rss: 'https://arg.software/rss.xml',
  atom: 'https://arg.software/atom.xml',
  sitemap: 'https://arg.software/sitemap.xml',
  note: 'Use the RSS or Atom feed for the complete current article list. Individual blog URLs also support markdown negotiation with Accept: text/markdown.',
};

const TOOLS = [
  {
    name: 'get_company_profile',
    description: 'Return a public profile of ARG Software.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'list_services',
    description: 'List ARG Software public service areas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'list_projects',
    description: 'List public ARG Software project case studies.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'get_project',
    description: 'Return one public ARG Software project case study by slug.',
    inputSchema: {
      type: 'object',
      required: ['slug'],
      additionalProperties: false,
      properties: {
        slug: {
          type: 'string',
          enum: PROJECTS.map(project => project.slug),
        },
      },
    },
  },
  {
    name: 'get_blog_discovery',
    description: 'Return blog discovery URLs for article feeds, sitemap, and markdown access.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'get_contact_options',
    description: 'Return public ARG Software contact and social links.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'get_llm_context',
    description: 'Return public LLM context document URLs for ARG Software.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
];

export const config = {
  path: '/mcp',
  method: ['POST', 'OPTIONS'],
};

export async function handlePublicDiscoveryMcp(request) {
  if (request.method === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (request.method !== 'POST') {
    return createResponse(405, createJsonRpcError(null, -32600, 'Method not allowed'));
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return createResponse(400, createJsonRpcError(null, -32700, 'Parse error'));
  }

  const response = handleJsonRpc(payload);
  if (!response) return createResponse(204, '');

  return createResponse(200, response);
}

function handleJsonRpc(payload) {
  if (Array.isArray(payload)) {
    return payload.map(handleJsonRpc).filter(Boolean);
  }

  const id = payload?.id ?? null;
  if (!payload?.method) {
    return createJsonRpcError(id, -32600, 'Invalid request');
  }

  if (payload.id === undefined && payload.method.startsWith('notifications/')) {
    return null;
  }

  switch (payload.method) {
    case 'initialize':
      return createJsonRpcResult(id, {
        protocolVersion: payload.params?.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: SERVER_INFO,
      });
    case 'tools/list':
      return createJsonRpcResult(id, { tools: TOOLS });
    case 'tools/call':
      return callTool(id, payload.params);
    case 'resources/list':
      return createJsonRpcResult(id, { resources: [] });
    case 'prompts/list':
      return createJsonRpcResult(id, { prompts: [] });
    default:
      return createJsonRpcError(id, -32601, 'Method not found');
  }
}

function callTool(id, params) {
  const name = params?.name;
  const args = params?.arguments || {};

  switch (name) {
    case 'get_company_profile':
      return createToolResult(id, {
        name: 'ARG Software',
        website: 'https://arg.software/',
        summary:
          'ARG Software is a Portugal-based software studio building secure, scalable digital platforms for fintech, open payments, music technology, media, web3, SaaS, and high-growth technology companies.',
        locations: ['Funchal, Portugal', 'Porto, Portugal'],
        operatingModel:
          'Senior-led, architecture-first product engineering with direct engineering ownership and long-term maintainability focus.',
      });
    case 'list_services':
      return createToolResult(id, { services: SERVICES });
    case 'list_projects':
      return createToolResult(id, { projects: PROJECTS });
    case 'get_project':
      return getProject(id, args.slug);
    case 'get_blog_discovery':
      return createToolResult(id, BLOG_DISCOVERY);
    case 'get_contact_options':
      return createToolResult(id, {
        email: 'hello@arg.software',
        contactPage: 'https://arg.software/contact/',
        projectBrief: 'https://arg.software/contact/#brief',
        portfolio: 'https://arg.software/files/portfolio.pdf',
        linkedin: 'https://www.linkedin.com/company/arg-software',
        github: 'https://github.com/ARG-Software',
        medium: 'https://medium.com/@arg-software',
      });
    case 'get_llm_context':
      return createToolResult(id, {
        summary: 'https://arg.software/llms.txt',
        full: 'https://arg.software/llms-full.txt',
      });
    default:
      return createJsonRpcError(id, -32602, 'Unknown tool');
  }
}

function getProject(id, slug) {
  const project = PROJECTS.find(item => item.slug === slug);

  if (!project) {
    return createJsonRpcError(id, -32602, 'Unknown project slug');
  }

  return createToolResult(id, project);
}

function createToolResult(id, data) {
  return createJsonRpcResult(id, {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
  });
}

function createJsonRpcResult(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

function createJsonRpcError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  };
}

function createResponse(status, body) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
