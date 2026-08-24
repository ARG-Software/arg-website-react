import { config, createAdminSessionApi } from '../../src/backend/admin/apps/adminSessionApi.ts';

export { config };

export default createAdminSessionApi({ env: process.env });
