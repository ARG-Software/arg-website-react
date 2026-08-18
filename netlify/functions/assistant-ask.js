import { config, createAssistantAskApi } from '../../backend/rag/api/assistantAskApi.js';

export { config };

export default createAssistantAskApi({ env: process.env });
