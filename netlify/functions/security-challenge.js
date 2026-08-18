import { config, createSecurityChallengeApi } from '../../backend/rag/api/securityChallengeApi.js';

export { config };

export default createSecurityChallengeApi({ env: process.env });
