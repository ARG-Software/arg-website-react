import {
  createAdminResponse,
  createErrorBody,
  getHttpErrorBody,
  getHttpErrorStatus,
  guardAdminRequest,
  listOutreachRecords,
  updateOutreachRecord,
} from '../shared/outreachAdmin.js';

export const config = {
  path: '/api/admin/outreach',
  method: ['GET', 'POST', 'OPTIONS'],
};

export default async function handler(request) {
  try {
    const guard = await guardAdminRequest(request);
    if (guard.response) return guard.response;

    if (request.method === 'GET') {
      const records = await listOutreachRecords(guard.client);
      return createAdminResponse(request, 200, { records });
    }

    if (request.method === 'POST') {
      const payload = await request.json();
      const record = await updateOutreachRecord(
        guard.client,
        payload.id,
        payload.changes,
        guard.user.email
      );

      return createAdminResponse(request, 200, { record });
    }

    return createAdminResponse(
      request,
      405,
      createErrorBody('method_not_allowed', 'Method not allowed')
    );
  } catch (error) {
    const statusCode = getHttpErrorStatus(error);

    if (statusCode === 500) {
      console.error(error);
    }

    return createAdminResponse(request, statusCode, getHttpErrorBody(error));
  }
}
