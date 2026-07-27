import { useCallback, useState } from 'react';
import { ALREADY_SUBSCRIBED_KEY } from '@constants/ui';
import { getWeb3FormsAccessKey, getWeb3FormsEndpoint } from '@services/linksservice';
import { trackEvent } from '@utils/analytics';

const LEAD_STEPS = {
  OFFER: 'offer',
  EMAIL: 'email',
  MESSAGE: 'message',
  CONFIRM: 'confirm',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function parseEmail(input) {
  const matches = input.match(EMAIL_REGEX);
  if (!matches) return { emails: [], hasEmail: false };
  return { emails: matches, hasEmail: true };
}

function extractEmailAndMessage(input) {
  const { emails, hasEmail } = parseEmail(input);

  if (!hasEmail) {
    return { email: null, message: input.trim(), hasEmail: false, multipleEmails: false };
  }

  if (emails.length > 1) {
    return { email: null, message: input.trim(), hasEmail: false, multipleEmails: true };
  }

  const email = emails[0];
  const message = input
    .replace(email, '')
    .replace(/^[,.\s:]+/, '')
    .replace(/[,.\s:]+$/, '')
    .trim();

  return {
    email,
    message: message || null,
    hasEmail: true,
    multipleEmails: false,
  };
}

export function useAssistantLeadCapture({ onDismiss, onComplete }) {
  const [leadStep, setLeadStep] = useState(null);
  const [capturedEmail, setCapturedEmail] = useState('');
  const [capturedMessage, setCapturedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isActive = leadStep !== null && leadStep !== LEAD_STEPS.SUCCESS;

  const startLeadCapture = useCallback(() => {
    setLeadStep(LEAD_STEPS.OFFER);
    setCapturedEmail('');
    setCapturedMessage('');
    setErrorMessage('');
    trackEvent('lead_capture', { action: 'impression', source: 'assistant' });
  }, []);

  const cancelLeadCapture = useCallback(() => {
    setLeadStep(null);
    setCapturedEmail('');
    setCapturedMessage('');
    setErrorMessage('');
  }, []);

  const declineLeadCapture = useCallback(() => {
    setLeadStep(null);
    setCapturedEmail('');
    setCapturedMessage('');
    trackEvent('lead_capture', { action: 'dismiss', source: 'assistant' });
    onDismiss?.();
  }, [onDismiss]);

  const submitLead = useCallback(async () => {
    setLeadStep(LEAD_STEPS.SUBMITTING);
    setErrorMessage('');
    trackEvent('lead_capture', { action: 'submit', source: 'assistant' });

    try {
      const formData = new FormData();
      formData.set('access_key', getWeb3FormsAccessKey());
      formData.set('subject', 'New ARG lead capture');
      formData.set('source', 'lead_capture_widget');
      formData.set('form_name', 'lead_capture');
      formData.set('email', capturedEmail);
      if (capturedMessage) {
        formData.set('message', capturedMessage);
      }

      const response = await fetch(getWeb3FormsEndpoint(), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      setLeadStep(LEAD_STEPS.SUCCESS);
      localStorage.setItem(ALREADY_SUBSCRIBED_KEY, '1');
      trackEvent('lead_capture', { action: 'success', source: 'assistant' });
      onComplete?.();
    } catch (error) {
      setLeadStep(LEAD_STEPS.ERROR);
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      trackEvent('lead_capture', { action: 'error', source: 'assistant' });
    }
  }, [capturedEmail, capturedMessage, onComplete]);

  const handleInput = useCallback(
    input => {
      const trimmed = input.trim();

      if (!trimmed) return { type: 'empty' };

      const lower = trimmed.toLowerCase();

      if (lower === 'cancel' || lower === 'nevermind' || lower === 'never mind') {
        cancelLeadCapture();
        return { type: 'cancelled' };
      }

      if (lower === 'no' || lower === 'no thanks' || lower === 'not now' || lower === 'stop') {
        declineLeadCapture();
        return { type: 'declined' };
      }

      if (leadStep === LEAD_STEPS.OFFER) {
        if (lower === 'yes' || lower === 'y' || lower === 'sure' || lower === 'ok') {
          setLeadStep(LEAD_STEPS.EMAIL);
          return { type: 'accepted' };
        }

        declineLeadCapture();
        return { type: 'declined' };
      }

      if (leadStep === LEAD_STEPS.EMAIL) {
        const { email, message, hasEmail, multipleEmails } = extractEmailAndMessage(trimmed);

        if (multipleEmails) {
          return { type: 'multiple_emails', input: trimmed };
        }

        if (!hasEmail) {
          return { type: 'no_email_found', input: trimmed };
        }

        setCapturedEmail(email);

        if (message) {
          setCapturedMessage(message);
          setLeadStep(LEAD_STEPS.CONFIRM);
          return { type: 'lead_captured', email, message };
        }

        setLeadStep(LEAD_STEPS.MESSAGE);
        return { type: 'email_captured', email };
      }

      if (leadStep === LEAD_STEPS.MESSAGE) {
        if (lower === 'skip' || lower === 'none' || lower === 'no message') {
          setCapturedMessage('');
          setLeadStep(LEAD_STEPS.CONFIRM);
          return { type: 'message_skipped' };
        }

        setCapturedMessage(trimmed);
        setLeadStep(LEAD_STEPS.CONFIRM);
        return { type: 'message_captured', message: trimmed };
      }

      if (leadStep === LEAD_STEPS.CONFIRM) {
        if (lower === 'send' || lower === 'yes' || lower === 'confirm' || lower === 'y') {
          submitLead();
          return { type: 'submitting' };
        }

        if (lower === 'edit' || lower === 'change' || lower === 'back') {
          setLeadStep(LEAD_STEPS.EMAIL);
          return { type: 'editing' };
        }

        cancelLeadCapture();
        return { type: 'cancelled' };
      }

      return { type: 'unknown' };
    },
    [leadStep, cancelLeadCapture, declineLeadCapture, submitLead]
  );

  const retrySubmit = useCallback(() => {
    submitLead();
  }, [submitLead]);

  return {
    leadStep,
    isActive,
    capturedEmail,
    capturedMessage,
    errorMessage,
    startLeadCapture,
    cancelLeadCapture,
    declineLeadCapture,
    handleInput,
    submitLead,
    retrySubmit,
    LEAD_STEPS,
  };
}
