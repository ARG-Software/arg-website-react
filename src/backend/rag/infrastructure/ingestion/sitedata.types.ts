import type { RagSourceMetadata } from '../../domain/content/iragsource.js';

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
  focus: string;
  personKey: string;
}

export interface ICareersJson {
  founders: {
    cards: ICareersFounderCard[];
  };
}

export interface ISiteLinksJson {
  calendar?: {
    project?: string;
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
  };
  feeds?: {
    rss?: string;
    atom?: string;
  };
  assets?: {
    portfolio?: string;
  };
}
