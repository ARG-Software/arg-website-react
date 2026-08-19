import { config, createSecurityVerifyApi } from '../../src/backend/rag/apps/gaspar/securityVerifyApi.js';

export { config };

export default createSecurityVerifyApi({ env: process.env });
