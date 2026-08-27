import { useCallback, useRef, useState } from 'react';
import { ALREADY_SUBSCRIBED_KEY } from '@constants/ui';
import { submitWeb3Form } from '@services/web3formsService';
import { trackEvent } from '@services/analytics';

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

const SUCCESS_RESET_MS = 3000;

export function useAssistantLeadCapture({ copy, onDismiss, onComplete }) {
  const [leadStep, setLeadStep] = useState(null);
  const [capturedEmail, setCapturedEmail] = useState('');
  const [capturedMessage, setCapturedMessage] = useState('');
  const [leadError, setLeadError] = useState('');
  const successTimerRef = useRef(null);

  const isActive = leadStep !== null && leadStep !== LEAD_STEPS.SUCCESS;

  const resetToNormal = useCallback(() => {
    setLeadStep(null);
    setLeadError('');
  }, []);

  const startLeadCapture = useCallback((initialStep = LEAD_STEPS.OFFER) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setLeadStep(initialStep);
    setCapturedEmail('');
    setCapturedMessage('');
    setLeadError('');
    trackEvent('lead_capture', { action: 'impression', source: 'assistant' });
  }, []);

  const cancelLeadCapture = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setLeadStep(null);
    setCapturedEmail('');
    setCapturedMessage('');
    setLeadError('');
  }, []);

  const declineLeadCapture = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setLeadStep(null);
    setCapturedEmail('');
    setCapturedMessage('');
    trackEvent('lead_capture', { action: 'dismiss', source: 'assistant' });
    onDismiss?.();
  }, [onDismiss]);

  const submitLead = useCallback(async () => {
    setLeadStep(LEAD_STEPS.SUBMITTING);
    setLeadError('');
    trackEvent('lead_capture', { action: 'submit', source: 'assistant' });

    try {
      if (!capturedEmail) {
        throw new Error(copy.messages.noEmailFound);
      }

      const result = await submitWeb3Form(
        {
          email: capturedEmail,
          message: capturedMessage || copy.messages.noMessageAdded,
          from_name: 'Gaspar lead capture',
          botcheck: '',
        },
        {
          subject: 'New ARG lead capture',
          source: 'lead_capture_widget',
          formName: 'lead_capture',
        }
      );

      setLeadStep(LEAD_STEPS.SUCCESS);
      try {
        localStorage.setItem(ALREADY_SUBSCRIBED_KEY, '1');
      } catch {
        /* storage unavailable */
      }
      trackEvent('lead_capture', { action: 'success', source: 'assistant' });
      onComplete?.();

      successTimerRef.current = setTimeout(resetToNormal, SUCCESS_RESET_MS);
      return result;
    } catch (error) {
      const message = copy.messages.answerFailed || 'Something went wrong. Please try again.';
      setLeadStep(LEAD_STEPS.ERROR);
      setLeadError(message);
      trackEvent('lead_capture', { action: 'error', source: 'assistant' });
      return {
        success: false,
        error,
      };
    }
  }, [capturedEmail, capturedMessage, copy.messages, onComplete, resetToNormal]);

  const handleInput = useCallback(
    (input, action) => {
      const trimmed = input.trim();

      if (leadStep === LEAD_STEPS.OFFER) {
        if (action === 'accept') {
          setLeadStep(LEAD_STEPS.EMAIL);
          return { type: 'accepted' };
        }

        declineLeadCapture();
        return { type: 'declined' };
      }

      if (leadStep === LEAD_STEPS.CONFIRM) {
        if (action === 'submit') return { type: 'submitting' };
        if (action === 'edit') {
          setLeadStep(LEAD_STEPS.EMAIL);
          return { type: 'editing' };
        }
        return { type: 'blocked' };
      }

      if (leadStep === LEAD_STEPS.SUBMITTING) {
        return { type: 'blocked' };
      }

      if (leadStep === LEAD_STEPS.EMAIL) {
        setLeadError('');

        if (!trimmed) {
          return { type: 'blocked' };
        }

        const { email, message, hasEmail, multipleEmails } = extractEmailAndMessage(trimmed);

        if (multipleEmails) {
          const message = copy.messages.multipleEmails;
          setLeadError(message);
          return { type: 'multiple_emails', message };
        }

        if (!hasEmail && capturedEmail) {
          const normalizedInput = trimmed.toLowerCase();
          const skipWords = copy.leadCaptureSkipWords.map(word => word.toLowerCase());

          if (action === 'skip' || skipWords.includes(normalizedInput)) {
            setCapturedMessage('');
            setLeadStep(LEAD_STEPS.CONFIRM);
            return { type: 'message_skipped' };
          }

          setCapturedMessage(trimmed);
          setLeadStep(LEAD_STEPS.CONFIRM);
          return { type: 'message_captured', message: trimmed };
        }

        if (!hasEmail) {
          const message = copy.messages.noEmailFound;
          setLeadError(message);
          return { type: 'no_email_found', message };
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
        const normalizedInput = trimmed.toLowerCase();
        const skipWords = copy.leadCaptureSkipWords.map(word => word.toLowerCase());

        if (action === 'skip' || skipWords.includes(normalizedInput)) {
          setCapturedMessage('');
          setLeadStep(LEAD_STEPS.CONFIRM);
          return { type: 'message_skipped' };
        }

        if (!trimmed) return { type: 'empty' };

        setCapturedMessage(trimmed);
        setLeadStep(LEAD_STEPS.CONFIRM);
        return { type: 'message_captured', message: trimmed };
      }

      return { type: 'blocked' };
    },
    [capturedEmail, copy.leadCaptureSkipWords, copy.messages, leadStep, declineLeadCapture]
  );

  return {
    leadStep,
    isActive,
    capturedEmail,
    capturedMessage,
    leadError,
    startLeadCapture,
    cancelLeadCapture,
    declineLeadCapture,
    handleInput,
    submitLead,
    LEAD_STEPS,
  };
}
