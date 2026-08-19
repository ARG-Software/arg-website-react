import { config, createAssistantAskApi } from '../../src/backend/rag/api/assistantAskApi.js';

export { config };

export default createAssistantAskApi({ env: process.env });
