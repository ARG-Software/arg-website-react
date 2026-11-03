import { readAdminResponse } from './adminResponse.js';

const ADMIN_ARCHITECT_RELEASES_ENDPOINT = '/api/admin/architect-releases';
const ADMIN_ARCHITECT_RELEASES_SYNC_ENDPOINT = '/api/admin/architect-releases/sync';

export async function fetchAdminArchitectReleases(query = {}) {
  const response = await fetch(
    createArchitectReleasesUrl(ADMIN_ARCHITECT_RELEASES_ENDPOINT, query)
  );

  return readAdminResponse(response);
}

export async function syncAdminArchitectReleases() {
  const response = await fetch(ADMIN_ARCHITECT_RELEASES_SYNC_ENDPOINT, { method: 'POST' });

  return readAdminResponse(response);
}

function createArchitectReleasesUrl(endpoint, query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${endpoint}?${search}` : endpoint;
}
