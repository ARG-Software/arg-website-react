import { config, createSecurityVerifyApi } from '../../backend/rag/api/securityVerifyApi.js';

export { config };

export default createSecurityVerifyApi({ env: process.env });
