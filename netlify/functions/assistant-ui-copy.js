import { config, createAssistantUiCopyApi } from '../../src/backend/rag/apps/gaspar/assistantUiCopyApi.js';

export { config };

export default createAssistantUiCopyApi({ env: process.env });
