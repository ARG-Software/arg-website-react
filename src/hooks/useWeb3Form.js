import { useState } from 'react';
import { getWeb3FormsAccessKey, getWeb3FormsEndpoint } from '../services/externalLinks';

const STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
});

export function useWeb3Form({
  subject,
  source,
  formName,
  resetOnSuccess = true,
  successMessage = 'Form submitted successfully.',
  errorMessage = 'Something went wrong. Please try again.',
  onSubmit,
  onSuccess,
  onError,
} = {}) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState('');

  async function submitForm(formElement) {
    const formData = formElement instanceof FormData ? formElement : new FormData(formElement);

    formData.set('access_key', getWeb3FormsAccessKey());
    if (subject) formData.set('subject', subject);
    if (source) formData.set('source', source);
    if (formName) formData.set('form_name', formName);

    setStatus(STATUS.LOADING);
    setResult('Sending...');
    onSubmit?.({ formData });

    try {
      const response = await fetch(getWeb3FormsEndpoint(), {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || errorMessage);
      }

      setStatus(STATUS.SUCCESS);
      setResult(successMessage);

      if (resetOnSuccess && !(formElement instanceof FormData)) {
        formElement.reset();
      }

      onSuccess?.({ data, formData });
      return { success: true, data };
    } catch (error) {
      setStatus(STATUS.ERROR);
      setResult(error.message || errorMessage);
      onError?.({ error, formData });
      return { success: false, error };
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    return submitForm(event.currentTarget);
  }

  function resetStatus() {
    setStatus(STATUS.IDLE);
    setResult('');
  }

  return {
    status,
    result,
    isSubmitting: status === STATUS.LOADING,
    submitForm,
    handleSubmit,
    resetStatus,
  };
}
