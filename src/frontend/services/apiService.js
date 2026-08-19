const API_ENDPOINTS = Object.freeze({
  ASSISTANT_ASK: '/api/assistant/ask',
  ASSISTANT_CHALLENGE: '/api/assistant/challenge',
  ASSISTANT_UI_COPY: '/api/assistant/ui-copy',
  SECURITY_CHALLENGE: '/api/security/challenge',
  SECURITY_VERIFY: '/api/security/verify',
});

export function getSecurityChallengeEndpoint() {
  return API_ENDPOINTS.SECURITY_CHALLENGE;
}

export async function fetchAssistantChallenge() {
  const response = await fetch(API_ENDPOINTS.ASSISTANT_CHALLENGE);

  if (!response.ok) {
    throw new Error(`Challenge request failed: ${response.status}`);
  }

  const { challenge } = await response.json();

  if (!challenge) {
    throw new Error('No challenge received');
  }

  return challenge;
}

export function submitAssistantQuestion(payload, { signal } = {}) {
  return fetch(API_ENDPOINTS.ASSISTANT_ASK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(payload),
  });
}

export function fetchAssistantUiCopy(language, { signal } = {}) {
  const params = new URLSearchParams({ language });

  return fetch(`${API_ENDPOINTS.ASSISTANT_UI_COPY}?${params.toString()}`, {
    method: 'GET',
    signal,
  });
}

export async function verifySecurityAltcha(altcha, { errorMessage } = {}) {
  const response = await fetch(API_ENDPOINTS.SECURITY_VERIFY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ altcha }),
  });
  const data = await response.json();

  if (!response.ok || !data.verified) {
    throw new Error(
      data.error?.message ||
        data.message ||
        errorMessage ||
        'Something went wrong. Please try again.'
    );
  }

  return data;
}
