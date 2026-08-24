import { config, createVisitRetentionApi } from '../../src/backend/admin/apps/visitRetentionApi.ts';

export { config };

export default createVisitRetentionApi({ env: process.env });
