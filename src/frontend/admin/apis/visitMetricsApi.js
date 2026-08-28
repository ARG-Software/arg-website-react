import { readAdminResponse } from './adminResponse.js';

const VISIT_METRICS_ENDPOINT = '/api/admin/visit-metrics';
const VISIT_SESSIONS_ENDPOINT = '/api/admin/visit-sessions';
const VISIT_SESSION_ENDPOINT = '/api/admin/visit-session';
const VISIT_JOURNEY_ENDPOINT = '/api/admin/visit-journey';

export async function fetchVisitMetrics(range = '30d') {
  const response = await fetch(buildVisitMetricsUrl({ range }));
  return readAdminResponse(response);
}

export async function fetchVisitSessions(query = {}) {
  const response = await fetch(buildVisitApiUrl(VISIT_SESSIONS_ENDPOINT, query));
  return readAdminResponse(response);
}

export async function fetchVisitJourney(sessionHash) {
  const response = await fetch(buildVisitApiUrl(VISIT_JOURNEY_ENDPOINT, { sessionHash }));
  return readAdminResponse(response);
}

export async function deleteVisitSession(sessionHash) {
  const response = await fetch(buildVisitApiUrl(VISIT_SESSION_ENDPOINT, { sessionHash }), {
    method: 'DELETE',
  });

  if (response.status === 204) return { deleted: true };

  return readAdminResponse(response);
}

function buildVisitMetricsUrl(query) {
  return buildVisitApiUrl(VISIT_METRICS_ENDPOINT, query);
}

function buildVisitApiUrl(endpoint, query) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}
