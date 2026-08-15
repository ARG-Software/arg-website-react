import crypto from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { createCorsHeaders, createOriginGuardResponse } from './apiOrigin.js';
import { decryptOutreachPayload, encryptOutreachPayload } from './outreachCrypto.js';

export const ADMIN_ALLOWED_METHODS = 'GET, POST, OPTIONS';

const ALLOWED_FIELDS = new Set([
  'company_name',
  'website',
  'contact_name',
  'contact_email',
  'contact_info',
  'contact_method',
  'fit_reason',
  'email_subject',
  'email_body',
  'status',
  'date_sent',
  'follow_up_date',
  'reply_summary',
  'notes',
  'source_round',
]);

const STATUS_VALUES = new Set([
  'draft',
  'ready',
  'sent',
  'replied',
  'follow_up_needed',
  'closed',
  'not_relevant',
]);

let supabase;

export async function guardAdminRequest(request) {
  const originGuardResponse = createOriginGuardResponse(request, ADMIN_ALLOWED_METHODS);
  if (originGuardResponse) return { response: originGuardResponse };

  if (request.method === 'OPTIONS') {
    return { response: createAdminResponse(request, 204, '') };
  }

  const token = getBearerToken(request);
  if (!token) {
    return {
      response: createAdminResponse(request, 401, createErrorBody('unauthenticated', 'Login required')),
    };
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user?.email) {
    return {
      response: createAdminResponse(request, 401, createErrorBody('unauthenticated', 'Login expired')),
    };
  }

  if (!getAllowedAdminEmails().has(data.user.email.toLowerCase())) {
    return {
      response: createAdminResponse(request, 403, createErrorBody('forbidden', 'Admin access denied')),
    };
  }

  return { user: data.user, client };
}

export async function listOutreachRecords(client) {
  const { data, error } = await client
    .from('outreach_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(toOutreachRecord);
}

export async function updateOutreachRecord(client, id, changes, actorEmail) {
  if (!id) {
    throw createHttpError(400, 'missing_id', 'Record id is required');
  }

  const { data, error } = await client.from('outreach_records').select('*').eq('id', id).single();

  if (error || !data) {
    throw createHttpError(404, 'not_found', 'Outreach record not found');
  }

  const currentPayload = decryptOutreachPayload(data);
  const nextPayload = {
    ...currentPayload,
    ...sanitizeChanges(changes),
  };

  if (nextPayload.status === 'sent' && !nextPayload.date_sent) {
    nextPayload.date_sent = new Date().toISOString().slice(0, 10);
  }

  const encryptedPayload = encryptOutreachPayload(nextPayload);
  const { data: updated, error: updateError } = await client
    .from('outreach_records')
    .update(encryptedPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) throw updateError;

  await writeAuditEvent(client, id, actorEmail, 'outreach_record_updated', {
    changed_fields: Object.keys(changes || {}).filter(field => ALLOWED_FIELDS.has(field)),
  });

  return toOutreachRecord(updated);
}

export function createAdminResponse(request, statusCode, body) {
  const responseBody =
    statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...createCorsHeaders(request, ADMIN_ALLOWED_METHODS),
      'Content-Type': 'application/json',
    },
  });
}

export function createErrorBody(code, message) {
  return { error: { code, message } };
}

export function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function getHttpErrorStatus(error) {
  return Number.isInteger(error?.statusCode) ? error.statusCode : 500;
}

export function getHttpErrorBody(error) {
  if (error?.code && error?.statusCode) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_request_failed', 'Admin request failed');
}

function toOutreachRecord(row) {
  return {
    id: row.id,
    sourceRound: row.source_round,
    sourceRowNumber: row.source_row_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...decryptOutreachPayload(row),
  };
}

function sanitizeChanges(changes = {}) {
  const sanitized = {};

  for (const [field, value] of Object.entries(changes)) {
    if (!ALLOWED_FIELDS.has(field)) continue;

    sanitized[field] = typeof value === 'string' ? value.trim() : value || null;
  }

  if (sanitized.status && !STATUS_VALUES.has(sanitized.status)) {
    throw createHttpError(400, 'invalid_status', 'Unsupported outreach status');
  }

  return sanitized;
}

async function writeAuditEvent(client, recordId, actorEmail, action, metadata) {
  const { error } = await client.from('outreach_audit_events').insert({
    outreach_record_id: recordId,
    actor_email_hash: hashEmail(actorEmail),
    action,
    metadata,
  });

  if (error) {
    console.error('Failed to write outreach audit event', error);
  }
}

function getSupabaseAdminClient() {
  if (!supabase) {
    supabase = createClient(requiredEnv('DATABASE_URL'), requiredEnv('DATABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabase;
}

function getBearerToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];
  return token || '';
}

function getAllowedAdminEmails() {
  const emails = (process.env.OUTREACH_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (!emails.length) {
    throw createHttpError(503, 'configuration_error', 'No outreach admin emails configured');
  }

  return new Set(emails);
}

function hashEmail(email) {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase()}:${process.env.OUTREACH_AUDIT_SALT || 'outreach'}`)
    .digest('hex');
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw createHttpError(503, 'configuration_error', `Missing required environment variable: ${name}`);
  }

  return value;
}
