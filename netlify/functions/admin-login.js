import { config, createAdminLoginApi } from '../../src/backend/admin/apps/adminLoginApi.js';

export { config };

export default createAdminLoginApi({ env: process.env });
