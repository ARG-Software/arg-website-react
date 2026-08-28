export type AssistantConversationMessageRole = 'user' | 'assistant';

export type AssistantConversationReferenceInput = {
  title?: string;
  url?: string;
};

export type AssistantConversationActionInput = {
  type?: string;
};

export type AssistantConversationMessageInput = {
  role?: string;
  content?: string;
  source?: string;
  language?: string;
  createdAt?: string;
  citations?: AssistantConversationReferenceInput[];
  articleRecommendations?: AssistantConversationReferenceInput[];
  actions?: AssistantConversationActionInput[];
};

export type AssistantConversationReference = {
  title: string;
  url: string;
};

export type AssistantConversationAction = {
  type: string;
};

export type AssistantConversationMessage = {
  role: AssistantConversationMessageRole;
  content: string;
  source?: string;
  language?: string;
  createdAt?: string;
  citations?: AssistantConversationReference[];
  articleRecommendations?: AssistantConversationReference[];
  actions?: AssistantConversationAction[];
};

export type AssistantConversationPageContextInput = {
  pathname?: string;
  title?: string;
  activeSection?: string;
};

export type AssistantConversationPageContext = {
  pathname: string;
  title: string;
  activeSection?: string;
};

export type AssistantConversationConstructorParams = {
  publicConversationId: string;
  messages: AssistantConversationMessageInput[];
  pageContext?: AssistantConversationPageContextInput;
  language?: string;
  savedAt?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AssistantConversationPagination = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
};
