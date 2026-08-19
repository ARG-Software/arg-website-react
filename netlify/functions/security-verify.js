import { config, createSecurityVerifyApi } from '../../src/backend/rag/api/securityVerifyApi.js';

export { config };

export default createSecurityVerifyApi({ env: process.env });
