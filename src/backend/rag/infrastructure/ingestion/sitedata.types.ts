import type { RagSourceMetadata } from '../../domain/sources/ragsource.types.js';

export interface IProjectJson extends RagSourceMetadata {
  slug: string;
  title: string;
  referenceRank?: number;
  client?: string;
  subtitle?: string;
  liveLink?: string;
}

export interface IPartnerJson extends RagSourceMetadata {
  slug: string;
  name: string;
  category?: string;
  industry?: string;
  link?: string;
}

export interface IPartnersJson {
  clients: IPartnerJson[];
}

export interface IFounderProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  focus: string;
  languageExperience?: string;
  tags: string[];
}

export interface IAboutJson {
  founders: {
    people: IFounderProfile[];
  };
  collaborators: {
    paragraphs: string[];
    disciplines: string[];
  };
}

export interface IHomepageTeamMember {
  name: string;
  role: string;
  personKey: string;
}

export interface IHomepageJson {
  team: {
    intro: string;
    members: IHomepageTeamMember[];
  };
}

export interface ICareersFounderCard {
  name: string;
  role: string;
  focus: string;
  replyTime: string;
  personKey: string;
}

interface ICareersSection {
  title: string;
  titleHighlight: string;
  subtitle: string;
}

export interface ICareersJson {
  seo: { openRolesDescription: string; noRolesDescription: string };
  hero: { openRolesSubtitle: string; noRolesSubtitle: string };
  roles: ICareersSection;
  hiring: ICareersSection;
  applicationForm: { title: string; description: string; helperText: string };
  who: ICareersSection;
  founders: {
    title: string;
    titleHighlight: string;
    intro: string;
    cards: ICareersFounderCard[];
  };
  cta: {
    openRolesTitle: string;
    openRolesTitleHighlight: string;
    noRolesTitle: string;
    noRolesTitleHighlight: string;
  };
}

interface IJobsTitledBody {
  title: string;
  body: string;
}

export interface IJobsJson {
  jobs: Array<{
    title: string;
    department: string;
    type: string;
    location: string;
    description: string;
    requirements: string[];
  }>;
  careerTraits: IJobsTitledBody[];
  hiringSteps: IJobsTitledBody[];
}

export interface ISiteLinksJson {
  calendar?: {
    project?: string;
    architecture?: string;
  };
  stores?: {
    chrome?: string;
    firefox?: string;
  };
  forms?: {
    projectBrief?: string;
  };
  emails?: {
    hello?: string;
  };
  socials?: {
    github?: string;
    linkedin?: string;
    medium?: string;
    youtube?: string;
  };
  feeds?: {
    rss?: string;
    atom?: string;
  };
  assets?: {
    portfolio?: string;
  };
}

export interface IFaqJson {
  items: Array<{ id: string; answer: Array<{ text?: string }> }>;
}

interface IAuditTitledText {
  title: string;
  text: string;
}

export interface IAuditPageJson {
  architect: {
    title: string;
    text: string;
    features: Array<IAuditTitledText & { metrics: string[] }>;
    browsers: Array<{ name: string }>;
    privacy: string;
    checks: { title: string; items: IAuditTitledText[] };
    private: { title: string; items: Array<{ label: string; text: string }> };
  };
  bridge: {
    text: string;
    layers: Array<{ name: string; tag: string; who: string; items: string[] }>;
  };
  review: {
    title: string;
    text: string;
    lists: Array<{ title: string; items: string[] }>;
    notIncludedLabel: string;
    notIncluded: string;
    price: {
      from: string;
      amount: string;
      meta: string;
      scopeTitle: string;
      scope: Array<{ label: string; value: string }>;
      scopeNote: string;
      cta: string;
    };
    sizes: {
      text: string;
      items: Array<IAuditTitledText & { name: string; price: string }>;
    };
  };
  start: {
    title: string;
    steps: IAuditTitledText[];
    proof: string;
  };
}
