import type { RagSourceMetadata } from '../../types/source.js';

export interface ProjectJson extends RagSourceMetadata {
  slug: string;
  title: string;
  client?: string;
  subtitle?: string;
  liveLink?: string;
}

export interface PartnerJson extends RagSourceMetadata {
  slug: string;
  name: string;
  category?: string;
  industry?: string;
  link?: string;
}

export interface PartnersJson {
  clients: PartnerJson[];
}

export interface FounderProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  focus: string;
  languageExperience?: string;
  tags: string[];
}

export interface AboutJson {
  founders: {
    people: FounderProfile[];
  };
  collaborators: {
    paragraphs: string[];
    disciplines: string[];
  };
}

export interface HomepageTeamMember {
  name: string;
  role: string;
  personKey: string;
}

export interface HomepageJson {
  team: {
    intro: string;
    members: HomepageTeamMember[];
  };
}

export interface CareersFounderCard {
  name: string;
  focus: string;
  personKey: string;
}

export interface CareersJson {
  founders: {
    cards: CareersFounderCard[];
  };
}
