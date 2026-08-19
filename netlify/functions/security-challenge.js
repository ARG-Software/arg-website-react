import { config, createSecurityChallengeApi } from '../../src/backend/rag/api/securityChallengeApi.js';

export { config };

export default createSecurityChallengeApi({ env: process.env });
