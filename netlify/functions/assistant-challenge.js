import {
  config,
  createAssistantChallengeApi,
} from '../../backend/rag/api/assistantChallengeApi.js';

export { config };

export default createAssistantChallengeApi({ env: process.env });
