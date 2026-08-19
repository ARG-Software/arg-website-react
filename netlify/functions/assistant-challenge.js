import {
  config,
  createAssistantChallengeApi,
} from '../../src/backend/rag/apps/gaspar/assistantChallengeApi.js';

export { config };

export default createAssistantChallengeApi({ env: process.env });
