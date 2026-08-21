import { config, createAdminUserApi } from '../../src/backend/admin/apps/adminUserApi.js';

export { config };

export default createAdminUserApi({ env: process.env });
