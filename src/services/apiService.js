const API_ENDPOINTS = Object.freeze({
  ASSISTANT_ASK: '/.netlify/functions/ask',
  ASSISTANT_CHALLENGE: '/.netlify/functions/ask-challenge',
  CONTACT_CHALLENGE: '/.netlify/functions/contact-challenge',
  CONTACT_SUBMIT: '/.netlify/functions/contact-submit',
});

export function getContactChallengeEndpoint() {
  return API_ENDPOINTS.CONTACT_CHALLENGE;
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

export async function submitVerifiedContactForm(fields, { errorMessage } = {}) {
  const response = await fetch(API_ENDPOINTS.CONTACT_SUBMIT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error?.message ||
        data.message ||
        errorMessage ||
        'Something went wrong. Please try again.'
    );
  }

  return data;
}
