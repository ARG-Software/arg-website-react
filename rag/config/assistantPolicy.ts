import { ASSISTANT_POLICY_CONTENT } from '../domain/assistant/AssistantPolicy.js';

export { ASSISTANT_POLICY_CONTENT };

export const ASSISTANT_POLICY_SOURCE = {
  kind: 'inline_json',
  sourceType: 'working_with_us',
  sourceKey: 'assistant-policy',
  title: 'Assistant Response Policy',
  label: 'assistant response policy',
  virtualPath: 'rag/config/assistantPolicy.ts',
  content: ASSISTANT_POLICY_CONTENT,
} as const;
