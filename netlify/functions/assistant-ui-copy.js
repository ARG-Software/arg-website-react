import { config, createAssistantUiCopyApi } from '../../backend/rag/api/assistantUiCopyApi.js';

export { config };

export default createAssistantUiCopyApi({ env: process.env });
