export const SITE_URL = 'https://arg.software';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services' },
  { href: '/#cases', label: 'Our Work' },
  { href: '/blog/', label: 'Blog' },
  { href: '/partners/', label: 'Partners' },
  { href: '/#cases', label: 'Use Cases' },
  { href: '/careers/', label: 'Careers' },
  { href: '/skills/', label: 'Skills' },
  { href: '/about-us/', label: 'About Us' },
  { href: '/working-with-us/', label: 'Working with Us' },
  { href: '/contact/', label: 'Contact' },
];

export const STATIC_PAGES = [
  {
    path: '/partners/',
    title: 'Partners | ARG Software',
    socialTitle: 'Partners',
    h1: 'Partners',
    pageType: 'WebPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Partners', path: '/partners/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Meet the companies ARG Software has partnered with across fintech, open payments, music technology, Web3, consultancy, and industry platforms.',
    paragraphs: [
      'ARG Software partners with teams across fintech, open payments, music technology, Web3, consultancy, and industry platforms.',
      'Our partners include the Interledger Foundation, a global nonprofit building an open interoperable payment network enabling seamless currency-agnostic transactions for the 1.4 billion people excluded from traditional banking.',
      'We work with the Mojaloop Foundation, building open-source interoperable payment systems that bring affordable digital financial services to unbanked populations worldwide.',
      'Our technology partners include Cyberbones, a Portugal-based systems architecture and technical leadership consultancy, ThreeSigma, a research-driven blockchain and decentralised finance advisory firm, and SkyTracks, a cloud-based music production platform enabling real-time collaboration between musicians and audio engineers.',
      'We also partner with Angry Ventures, a hands-on venture studio that builds and scales digital products, and North Music Group, a music rights management company providing modern tools for catalogue management and royalty tracking.',
    ],
  },
  {
    path: '/blog/',
    title: 'Blog & Insights | ARG Software',
    socialTitle: 'Blog & Insights',
    h1: 'Blog & Insights',
    pageType: 'CollectionPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog/' },
    ],
    priority: '0.9',
    changefreq: 'weekly',
    description:
      'Technical articles from the ARG Software team on architecture, TypeScript, .NET, DevOps, AI tooling, and the engineering decisions behind reliable software.',
    paragraphs: [
      'The ARG Software blog covers practical software engineering: architecture, TypeScript, .NET, DevOps, AI tooling, and the tradeoffs behind reliable production systems.',
      'We write practical guides on topics like enforcing clean architecture in TypeScript, CQRS without MediatR in .NET, dependency injection patterns in ASP.NET Core, and functional error handling with the Result pattern.',
      'Our DevOps blog posts cover running Docker natively on Windows with WSL2, local Kubernetes clusters with NestJS and PostgreSQL, and debugging microservices with Prometheus and OpenTelemetry.',
      'We also write about software engineering culture, including the art of pull requests, building scalable monorepos with Nx and NestJS, and the real impact of AI on software development teams.',
    ],
  },
  {
    path: '/skills/',
    title: 'Skills | ARG Software',
    socialTitle: 'Skills',
    h1: 'Skills',
    pageType: 'CollectionPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Skills', path: '/skills/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Agent skills ARG Software uses to keep architecture, frontend, and delivery consistent across production systems.',
    paragraphs: [
      'ARG Software publishes the agent skills we use to keep architecture, frontend, and delivery consistent.',
      'Skills cover workflow, frontend, architecture, and delivery practices we load into our tools.',
      'This catalog will grow into per-skill files. The current page is a layout prototype with dummy copy.',
    ],
  },
  {
    path: '/careers/',
    title: 'Careers | ARG Software',
    socialTitle: 'Careers',
    h1: 'Careers at ARG Software',
    pageType: 'WebPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Careers', path: '/careers/' },
    ],
    priority: '0.9',
    changefreq: 'weekly',
    description:
      'ARG Software is not hiring today. Learn what we look for in architecture-first engineers and how to reach the founders directly.',
    paragraphs: [
      'ARG Software is not hiring for a specific role today, but we still want to hear from engineers who think like us.',
      'We stay selective. The right conversations are worth having before a role exists.',
      'If you think you would fit at ARG Software, reach out directly to the founders with a short note about what you have built.',
    ],
  },
  {
    path: '/working-with-us/',
    title: 'Working with Us | ARG Software',
    socialTitle: 'Working with Us',
    h1: 'Working with ARG Software',
    pageType: 'WebPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Working with Us', path: '/working-with-us/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Work with ARG Software when architecture, reliability, and senior execution matter from the first technical decision to production.',
    paragraphs: [
      'Working with ARG Software means partnering with an architecture-first engineering team that designs the system before writing it and stays close when it reaches production. Founders stay close to the work, and a trusted network of collaborators is assembled around each problem.',
      'We build production-ready platforms for fintech, media, open payments, music technology, and high-growth technology companies.',
      'Our process emphasizes technical planning, observable systems, clean hand-off, and senior founder involvement from first conversation to production support.',
    ],
  },
  {
    path: '/about-us/',
    title: 'About Our Architecture-First Studio | ARG Software',
    socialTitle: 'About Our Architecture-First Studio',
    h1: 'A way of working, before a company.',
    pageType: 'AboutPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'About Us', path: '/about-us/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Meet ARG Software, an architecture-first engineering studio based in Portugal, Europe, built on senior ownership, technical trust and maintainable systems.',
    paragraphs: [
      'ARG Software started as a way of working before it became a company in 2020.',
      'José Antunes and Rui Rocha formalized a partnership built on direct communication, technical discipline, clear ownership and a high standard for delivery.',
      'ARG extends beyond its founders through a trusted network of engineers and specialists assembled around each problem, with quality over quantity kept non-negotiable.',
    ],
  },
  {
    path: '/contact/',
    title: 'Contact | ARG Software',
    socialTitle: 'Contact',
    h1: 'Contact ARG Software',
    pageType: 'ContactPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Contact ARG Software with a clear project brief. Tell us what you are building, what feels risky, and where senior engineering help is needed.',
    paragraphs: [
      'Contact ARG Software to start a conversation about architecture, reliability, senior execution, or a complex software product that needs a clear technical path.',
      'Send a short brief with your name, email, company, and the context that matters. A senior engineer will review it and suggest the next useful step.',
      'ARG Software works with fintech, media, open payments, music technology, and high-growth technology teams that need production-ready systems.',
    ],
  },
  {
    path: '/privacy/',
    title: 'Privacy Policy | ARG Software',
    socialTitle: 'Privacy Policy',
    h1: 'Privacy Policy',
    pageType: 'WebPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Privacy', path: '/privacy/' },
    ],
    priority: '0.3',
    changefreq: 'yearly',
    description:
      "ARG Software's privacy policy - how we collect, use, and protect your personal data.",
    paragraphs: [
      'This privacy policy explains how ARG Software collects, uses, and protects your personal data when you visit our website or use our services.',
      'We are committed to ensuring that your privacy is protected and that we comply with applicable data protection regulations including GDPR.',
    ],
  },
  {
    path: '/terms/',
    title: 'Terms of Service | ARG Software',
    socialTitle: 'Terms of Service',
    h1: 'Terms of Service',
    pageType: 'WebPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Terms', path: '/terms/' },
    ],
    priority: '0.3',
    changefreq: 'yearly',
    description:
      "ARG Software's terms of service - the conditions governing the use of our website and services.",
    paragraphs: [
      "These terms of service outline the rules and regulations for the use of ARG Software's website and services.",
      'By accessing this website, you accept these terms and conditions in full.',
    ],
  },
];
