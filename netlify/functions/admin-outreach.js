import { config, createAdminOutreachApi } from '../../src/backend/admin/apps/adminOutreachApi.ts';

export { config };

export default createAdminOutreachApi({ env: process.env });
