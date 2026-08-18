import { handleAdminOutreachApi } from '../../../backend/admin/api/adminOutreachApi.js';

export const config = {
  path: '/api/admin/outreach',
  method: ['GET', 'POST', 'OPTIONS'],
};

export async function handleAdminOutreach(request) {
  return handleAdminOutreachApi(request, { env: process.env });
}
