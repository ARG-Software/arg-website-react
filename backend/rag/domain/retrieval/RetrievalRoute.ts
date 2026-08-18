import type { RagSourceType } from '../content/RagSource.js';

export type RetrievalRouteKind =
  | 'blog'
  | 'careers'
  | 'commercial_delivery'
  | 'company_services'
  | 'direct_evidence'
  | 'editorial'
  | 'link_action'
  | 'open_source'
  | 'people'
  | 'portfolio_work'
  | 'technology_quality';

export type BlogRouteKind = 'answer' | 'latest' | 'topic_discovery';

export type CommercialDeliveryKind =
  | 'engagement_duration'
  | 'general_pricing'
  | 'project_budget'
  | 'project_duration'
  | 'timeline_estimate';

export interface RetrievalRoute {
  kind: RetrievalRouteKind;
  firstPartySourceTypes: RagSourceType[] | null;
  entity: string;
  subject: string;
  sourceKeys?: string[];
  forceFirstChunks?: boolean;
  blogKind?: BlogRouteKind;
  commercialKind?: CommercialDeliveryKind;
  requiresPersonClarification?: boolean;
}
