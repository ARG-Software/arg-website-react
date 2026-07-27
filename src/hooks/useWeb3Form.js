import { useState } from 'react';
import { submitWeb3Form } from '@services/web3formsService';

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

    setStatus(STATUS.LOADING);
    setResult('Sending...');
    onSubmit?.({ formData });

    try {
      const { data } = await submitWeb3Form(formData, { subject, source, formName, errorMessage });

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
