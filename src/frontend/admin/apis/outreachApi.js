import { readAdminResponse } from './adminResponse.js';

const ADMIN_OUTREACH_RECORDS_ENDPOINT = '/api/admin/outreach-records';
const ADMIN_OUTREACH_SUMMARY_ENDPOINT = '/api/admin/outreach-summary';
const ADMIN_OUTREACH_CHART_ENDPOINT = '/api/admin/outreach-chart';
const ADMIN_OUTREACH_EXPORT_ENDPOINT = '/api/admin/outreach-export';
const ADMIN_OUTREACH_IMPORT_ENDPOINT = '/api/admin/outreach-import';
const ADMIN_OUTREACH_RECORD_ENDPOINT = '/api/admin/outreach-record';

export async function fetchOutreachRecords(query = {}) {
  const response = await fetch(createOutreachUrl(ADMIN_OUTREACH_RECORDS_ENDPOINT, query));

  return readAdminResponse(response);
}

export async function fetchOutreachSummary() {
  const response = await fetch(ADMIN_OUTREACH_SUMMARY_ENDPOINT);

  return readAdminResponse(response);
}

export async function fetchOutreachChart(range) {
  const response = await fetch(createOutreachUrl(ADMIN_OUTREACH_CHART_ENDPOINT, { range }));

  return readAdminResponse(response);
}

export async function fetchOutreachRecord(id) {
  const response = await fetch(createOutreachUrl(ADMIN_OUTREACH_RECORD_ENDPOINT, { id }));

  return readAdminResponse(response);
}

export async function updateOutreachRecord(id, record) {
  const response = await fetch(ADMIN_OUTREACH_RECORD_ENDPOINT, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, record }),
  });

  return readAdminResponse(response);
}

export async function importOutreachCsv(csv) {
  const response = await fetch(ADMIN_OUTREACH_IMPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ csv }),
  });

  return readAdminResponse(response);
}

export async function exportOutreachCsv() {
  const response = await fetch(ADMIN_OUTREACH_EXPORT_ENDPOINT);

  if (!response.ok) {
    await readAdminResponse(response);
  }

  return response.text();
}

function createOutreachUrl(endpoint, query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${endpoint}?${search}` : endpoint;
}
