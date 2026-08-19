import { config, createSecurityChallengeApi } from '../../src/backend/rag/apps/gaspar/securityChallengeApi.js';

export { config };

export default createSecurityChallengeApi({ env: process.env });
