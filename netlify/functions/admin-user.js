import { config, createAdminUserApi } from '../../src/backend/admin/apps/adminUserApi.ts';

export { config };

export default createAdminUserApi({ env: process.env });
