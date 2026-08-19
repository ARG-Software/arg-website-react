import {
  config,
  createAssistantChallengeApi,
} from '../../src/backend/rag/api/assistantChallengeApi.js';

export { config };

export default createAssistantChallengeApi({ env: process.env });
