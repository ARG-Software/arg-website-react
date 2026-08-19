import { config, createAdminOutreachApi } from '../../src/backend/admin/apps/adminOutreachApi.js';

export { config };

export default createAdminOutreachApi({ env: process.env });
