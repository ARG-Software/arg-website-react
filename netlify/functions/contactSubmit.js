import { verifyAltchaPayload } from '../../rag/security/altcha.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const WEB3_FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3_FORMS_ACCESS_KEY =
  process.env.WEB3FORMS_ACCESS_KEY || '64440476-6752-463a-a2f3-56c028cf8be0';
const FORWARDED_FIELDS = ['name', 'email', 'company', 'message', 'subject', 'source', 'form_name'];

export const config = {
  path: '/.netlify/functions/contact-submit',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, createErrorBody('method_not_allowed', 'Method not allowed'));
  }

  let fields;

  try {
    fields = JSON.parse(event.body || '{}').fields || {};
  } catch {
    return createResponse(400, createErrorBody('invalid_json', 'Invalid JSON body'));
  }

  if (fields.botcheck) {
    return createResponse(400, createErrorBody('spam_detected', 'Unable to submit this form'));
  }

  try {
    if (!fields.altcha) {
      return createResponse(403, createErrorBody('bot_verification_failed', 'Verification required'));
    }

    const altchaResult = await verifyAltchaPayload(String(fields.altcha));

    if (!altchaResult.verified) {
      return createResponse(403, createErrorBody('bot_verification_failed', 'Verification failed'));
    }
  } catch {
    return createResponse(403, createErrorBody('bot_verification_failed', 'Verification failed'));
  }

  try {
    const formData = new FormData();
    formData.set('access_key', WEB3_FORMS_ACCESS_KEY);

    FORWARDED_FIELDS.forEach(field => {
      const value = fields[field];

      if (value !== undefined && value !== null && value !== '') {
        formData.set(field, String(value));
      }
    });

    const response = await fetch(WEB3_FORMS_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      return createResponse(
        response.ok ? 502 : response.status,
        createErrorBody('submission_failed', data.message || 'Unable to submit this form')
      );
    }

    return createResponse(200, { success: true, data });
  } catch (error) {
    console.error(error);
    return createResponse(500, createErrorBody('submission_failed', 'Unable to submit this form'));
  }
}

function createErrorBody(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}
