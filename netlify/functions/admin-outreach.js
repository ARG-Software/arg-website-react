import { config, createAdminOutreachApi } from '../../backend/admin/api/adminOutreachApi.js';

export { config };

export default createAdminOutreachApi({ env: process.env });
