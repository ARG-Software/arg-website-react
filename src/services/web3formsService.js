import { getWeb3FormsAccessKey, getWeb3FormsEndpoint } from '@services/linksservice';

const CONTACT_SUBMIT_ENDPOINT = '/.netlify/functions/contact-submit';

function appendFields(formData, fields = {}) {
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.set(key, value);
  });
}

export async function submitWeb3Form(fields, { subject, source, formName, errorMessage } = {}) {
  const formData = fields instanceof FormData ? fields : new FormData();

  if (!(fields instanceof FormData)) {
    appendFields(formData, fields);
  }

  formData.set('access_key', getWeb3FormsAccessKey());
  if (subject) formData.set('subject', subject);
  if (source) formData.set('source', source);
  if (formName) formData.set('form_name', formName);

  if (formName === 'contact_page_brief') {
    return submitVerifiedContactForm(formData, errorMessage);
  }

  const response = await fetch(getWeb3FormsEndpoint(), {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || errorMessage || 'Something went wrong. Please try again.');
  }

  return { success: true, data, formData };
}

async function submitVerifiedContactForm(formData, errorMessage) {
  formData.delete('access_key');

  const response = await fetch(CONTACT_SUBMIT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: Object.fromEntries(formData.entries()) }),
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

  return { success: true, data, formData };
}
