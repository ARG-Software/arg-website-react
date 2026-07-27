import { submitVerifiedContactForm as submitVerifiedContactFormRequest } from '@services/apiService';
import { getWeb3FormsAccessKey, getWeb3FormsEndpoint } from '@services/linksService';

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
    return submitContactPageBrief(formData, errorMessage);
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

async function submitContactPageBrief(formData, errorMessage) {
  formData.delete('access_key');
  const data = await submitVerifiedContactFormRequest(Object.fromEntries(formData.entries()), {
    errorMessage,
  });

  return { success: true, data, formData };
}
