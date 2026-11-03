const ARCHITECT_RELEASES_ENDPOINT = '/api/architect-releases';

export async function fetchArchitectReleases({ page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await fetch(`${ARCHITECT_RELEASES_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Architect releases request failed: ${response.status}`);
  }

  return response.json();
}
