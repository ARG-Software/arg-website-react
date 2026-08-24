import { readAdminResponse } from './adminResponse.js';

const ADMIN_OUTREACH_ENDPOINT = '/api/admin/outreach';

export async function fetchOutreachRecords(query = {}) {
  const response = await fetch(createOutreachUrl(query));

  return readAdminResponse(response);
}

export async function fetchOutreachSummary() {
  const response = await fetch(createOutreachUrl({ scope: 'summary' }));

  return readAdminResponse(response);
}

export async function fetchOutreachChart(range) {
  const response = await fetch(createOutreachUrl({ scope: 'chart', range }));

  return readAdminResponse(response);
}

export async function updateOutreachRecord(id, record) {
  const response = await fetch(ADMIN_OUTREACH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, record }),
  });

  return readAdminResponse(response);
}

export async function importOutreachCsv(csv) {
  const response = await fetch(ADMIN_OUTREACH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'import', csv }),
  });

  return readAdminResponse(response);
}

export async function exportOutreachCsv() {
  const response = await fetch(createOutreachUrl({ scope: 'export', format: 'csv' }));

  if (!response.ok) {
    await readAdminResponse(response);
  }

  return response.text();
}

function createOutreachUrl(query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${ADMIN_OUTREACH_ENDPOINT}?${search}` : ADMIN_OUTREACH_ENDPOINT;
}
