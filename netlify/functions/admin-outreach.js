import { config, createAdminOutreachApi } from '../../src/backend/admin/api/adminOutreachApi.js';

export { config };

export default createAdminOutreachApi({ env: process.env });
