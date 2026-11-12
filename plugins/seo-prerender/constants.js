import fs from 'node:fs';
import {
  buildArchitectureReviewSchemas,
  buildAuditSchemas,
} from '../../src/frontend/utils/structuredData.js';

const readData = name =>
  JSON.parse(fs.readFileSync(new URL(`../../src/frontend/data/${name}`, import.meta.url), 'utf8'));

export const SITE_URL = 'https://arg.software';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services' },
  { href: '/#cases', label: 'Our Work' },
  { href: '/blog/', label: 'Blog' },
  { href: '/partners/', label: 'Partners' },
  { href: '/#cases', label: 'Use Cases' },
  { href: '/careers/', label: 'Careers' },
  { href: '/skills/', label: 'AI Skills' },
  { href: '/patterns/', label: 'Patterns' },
  { href: '/about-us/', label: 'About Us' },
  { href: '/working-with-us/', label: 'Working with Us' },
  { href: '/audit/', label: 'Audit' },
  { href: '/contact/', label: 'Contact' },
];

export const STATIC_PAGES = [
  {
    path: '/partners/',
    title: 'Partners and Teams We Build Software With | ARG Software',
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
    title: 'Agent Skills for Claude Code, Cursor, OpenCode and Copilot',
    socialTitle: 'Agent Skills for Claude Code, Cursor, OpenCode and Copilot',
    h1: 'The skills we use to ship production work.',
    pageType: 'CollectionPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'AI Skills', path: '/skills/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Open-source SKILL.md agent skills for Claude Code, Cursor, OpenCode and GitHub Copilot: Angular, .NET, Nx, React Native, MCP, code review, security and DevOps.',
    paragraphs: [
      "These are ARG's working habits, written down for AI coding tools — how we design, review, and ship — so the assistant follows the same standard we use on client work.",
      'Skills cover browser extensions, Angular, Nx monorepos, .NET, React Native, MCP servers, web quality audits, code review, security audits, and DevOps setup.',
      'Install with npx skills add ARG-Software/arg-agent-skills. Available for Claude Code, Cursor, Codex, OpenCode, and GitHub Copilot.',
    ],
  },
  {
    path: '/patterns/',
    title: 'Architecture Patterns with C# and TypeScript | ARG Software',
    socialTitle: 'Software Architecture Patterns',
    h1: 'Architecture patterns with working code.',
    pageType: 'CollectionPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Patterns', path: '/patterns/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Architecture and design patterns for distributed systems and domain-driven design, each with a short C# and TypeScript example, when to use it, and when to avoid it.',
    paragraphs: [
      'The patterns ARG Software uses on production systems, each explained with the problem it solves, a short C# example, a short TypeScript example, and when to avoid it.',
    ],
  },
  {
    path: '/careers/',
    title: 'Remote Software Engineering Careers | ARG Software',
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
    path: '/audit/',
    title: 'Free Website Audit & Architecture Review | ARG Software',
    socialTitle: 'Free Website Audit & Architecture Review',
    h1: "Know what's holding your product back.",
    pageType: 'WebPage',
    jsonLd: buildAuditSchemas(readData('auditPage.json'), readData('siteLinks.json').stores),
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Audit', path: '/audit/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'Free website audit from your browser with ARG Architect. Got a report? We review it with you for €500, or look inside the system from €3,500.',
    paragraphs: [
      'ARG Architect is a free browser extension from ARG Software. Open any public page, press audit, and get one weighted score across eight categories: security, performance, architecture, efficiency, payload, accessibility, AI readiness and DOM. Every failing check names exactly what fails and recommends a fix. Audit the current tab or queue up to 10 URLs, compare any two runs side by side, and export any report as PDF, Markdown, or JSON. It is available on the Chrome Web Store and Firefox Add-ons; Brave, Edge and Opera install it from the Chrome Web Store. No account, no analytics, no tracking. It only sees what a browser can see; it does not review the system behind the page.',
      'How to read an ARG Architect report: the overall score falls in one of four bands, Critical below 50, Needs Work from 50 to 59, Good from 60 to 79 and Excellent from 80. Category weights are Security 30, Performance 20, Architecture 15, Efficiency 9, Payload 8, Accessibility 7, AI Readiness 6 and DOM 5, and each category counts by its weight times its evidence coverage. A row with no verdict says why: off, check failed, not detected, not observed, or info. Measurements are lab numbers from repeated cache-bypass reloads, not field data.',
      'Next steps start with the report. The report review costs EUR 500, fixed price, delivered within one week: every finding confirmed and false positives removed, what is left ranked by impact, a fix plan with the effort for each item, and a 60-minute call with the engineer who reviewed it. It covers what the report shows, with no access to code, database or infrastructure. When the cause is in the code, the data or the infrastructure, the architecture review looks inside the system, from EUR 3,500 for one week.',
      'To send a report, open the Contact tab in the extension, pick Audit Result, attach a saved report and press Send. ARG replies with the step that fits and its price, and nothing starts until you confirm. Only the scores, the checks that need attention and the audit setup are sent; passing checks, script bodies and credential values never are.',
    ],
  },
  {
    path: '/audit/architecture-review/',
    title: 'Architecture Review, One Week from €3,500 | ARG Software',
    socialTitle: 'Architecture Review, One Week from €3,500',
    h1: 'Architecture review. One week inside your system.',
    pageType: 'WebPage',
    jsonLd: buildArchitectureReviewSchemas(readData('auditPage.json')),
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Audit', path: '/audit/' },
      { name: 'Architecture review', path: '/audit/architecture-review/' },
    ],
    priority: '0.8',
    changefreq: 'monthly',
    description:
      'One week of a senior engineer on the part of your system that matters most: system design, code, scalability, integrations, infrastructure and security, from €3,500.',
    paragraphs: [
      'A browser sees the outside of a product. The architecture review is the inside: one week of a senior engineer on the part of the system that matters most, covering system design, code quality, scalability, integrations, infrastructure and operations, and security inside an agreed scope.',
      'The review starts from EUR 3,500 for one week, remote, in EU timezone. It is not a review of the whole application. The scope is agreed on the architecture call before any invoice; what usually fits in a week is one product, one critical journey, up to two repos, one environment. For a bigger system the week does not grow; the path becomes Slice, Map, or a multi-week review quoted by the week.',
      'The client gets a written report, a map of what was reviewed, risks ranked by impact, a 90-day plan (do now, do later, ignore), a list of what was left out of scope, and a 60-minute readout. After a report review, booking the architecture review within 60 days takes the EUR 500 off the price.',
      'Not included: anything outside the agreed scope, a pentest, a full-platform certification, an AI-citation study, or a ticket-level rewrite plan.',
    ],
  },
  {
    path: '/audit/changelog/',
    title: 'ARG Architect Changelog | ARG Software',
    socialTitle: 'ARG Architect Changelog',
    h1: "What's new in ARG Architect.",
    pageType: 'WebPage',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Audit', path: '/audit/' },
      { name: 'Changelog', path: '/audit/changelog/' },
    ],
    priority: '0.6',
    changefreq: 'weekly',
    description:
      'Release notes for ARG Architect, the free browser extension that audits a public page in one click.',
    paragraphs: [
      'ARG Architect is versioned through GitHub Releases. This page lists published versions, titles, and release notes for the free website audit extension.',
      'Each entry is a published version: tag, date, and notes. Draft releases are not shown. The changelog lives on arg.software so the extension can link to it while the Architect repository stays private.',
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
    title: 'Contact Us: Start a Software Project | ARG Software',
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
      "ARG Software's privacy policy: what personal data we collect, how we use it, cookies and tracking, data sharing, retention, security, and your rights.",
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
      "ARG Software's terms of service: use of our website and services, intellectual property, confidentiality, payment terms, liability, and Portuguese law.",
    paragraphs: [
      "These terms of service outline the rules and regulations for the use of ARG Software's website and services.",
      'By accessing this website, you accept these terms and conditions in full.',
    ],
  },
];
