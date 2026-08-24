import { readAdminResponse } from './adminResponse.js';

const VISIT_METRICS_ENDPOINT = '/api/admin/visit-metrics';

export async function fetchVisitMetrics(range = '30d') {
  const response = await fetch(buildVisitMetricsUrl({ range }));
  return readAdminResponse(response);
}

export async function fetchVisitSessions(query = {}) {
  const response = await fetch(buildVisitMetricsUrl({ scope: 'sessions', ...query }));
  return readAdminResponse(response);
}

export async function fetchVisitJourney(sessionHash) {
  const response = await fetch(buildVisitMetricsUrl({ scope: 'journey', sessionHash }));
  return readAdminResponse(response);
}

function buildVisitMetricsUrl(query) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${VISIT_METRICS_ENDPOINT}?${queryString}` : VISIT_METRICS_ENDPOINT;
}
