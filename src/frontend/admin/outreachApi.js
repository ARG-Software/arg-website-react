const ADMIN_OUTREACH_ENDPOINT = '/api/admin/outreach';

export async function fetchOutreachRecords(accessToken, query = {}) {
  const response = await fetch(createOutreachUrl(query), {
    headers: createAuthHeaders(accessToken),
  });

  return readAdminResponse(response);
}

export async function fetchOutreachSummary(accessToken) {
  const response = await fetch(createOutreachUrl({ scope: 'summary' }), {
    headers: createAuthHeaders(accessToken),
  });

  return readAdminResponse(response);
}

export async function fetchOutreachChart(accessToken, range) {
  const response = await fetch(createOutreachUrl({ scope: 'chart', range }), {
    headers: createAuthHeaders(accessToken),
  });

  return readAdminResponse(response);
}

export async function updateOutreachRecord(accessToken, id, changes) {
  const response = await fetch(ADMIN_OUTREACH_ENDPOINT, {
    method: 'POST',
    headers: {
      ...createAuthHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, changes }),
  });

  return readAdminResponse(response);
}

function createAuthHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
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

async function readAdminResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || 'Admin request failed');
  }

  return data;
}
