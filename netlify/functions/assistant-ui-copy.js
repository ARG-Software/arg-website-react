import { config, createAssistantUiCopyApi } from '../../src/backend/rag/api/assistantUiCopyApi.js';

export { config };

export default createAssistantUiCopyApi({ env: process.env });
