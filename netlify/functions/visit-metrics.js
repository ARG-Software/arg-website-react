import { config, createVisitMetricsApi } from '../../src/backend/admin/apps/visitMetricsApi.ts';

export { config };

export default createVisitMetricsApi({ env: process.env });
