import { config, createAdminSessionApi } from '../../src/backend/admin/apps/adminSessionApi.js';

export { config };

export default createAdminSessionApi({ env: process.env });
