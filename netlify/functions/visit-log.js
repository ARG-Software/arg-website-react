import { config, createVisitLogApi } from '../../src/backend/admin/apps/visitLogApi.ts';

export { config };

export default createVisitLogApi({ env: process.env });
