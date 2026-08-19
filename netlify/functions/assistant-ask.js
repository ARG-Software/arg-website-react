import { config, createAssistantAskApi } from '../../src/backend/rag/apps/gaspar/assistantAskApi.js';

export { config };

export default createAssistantAskApi({ env: process.env });
