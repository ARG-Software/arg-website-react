export class AdminApplicationError extends Error {
  statusCode: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AdminApplicationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const BAD_REQUEST_ERROR_CODES = new Set([
  'empty_visit_payload',
  'invalid_csv',
  'invalid_contact_method',
  'invalid_messages',
  'invalid_sort',
  'invalid_status',
  'missing_company_name',
  'missing_id',
  'missing_sent_date',
  'missing_session_id',
  'too_many_rows',
]);

export function createAdminError(statusCode, code, message) {
  return new AdminApplicationError(statusCode, code, message);
}

export function getAdminErrorStatus(error) {
  if (Number.isInteger(error?.statusCode)) return error.statusCode;

  if (error?.code === 'not_found') return 404;
  if (error?.code === 'duplicate_record') return 409;
  if (
    error?.code === 'missing_assistant_conversation_encryption_key' ||
    error?.code === 'invalid_assistant_conversation_encryption_key'
  ) {
    return 503;
  }

  if (BAD_REQUEST_ERROR_CODES.has(error?.code)) return 400;

  return 500;
}
