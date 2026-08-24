import { config, createAdminLoginApi } from '../../src/backend/admin/apps/adminLoginApi.ts';

export { config };

export default createAdminLoginApi({ env: process.env });
