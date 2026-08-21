export class AdminApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

export async function readAdminResponse(response, fallbackMessage = 'Admin request failed') {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AdminApiError(data.error?.message || fallbackMessage, {
      status: response.status,
      code: data.error?.code,
    });
  }

  return data;
}
