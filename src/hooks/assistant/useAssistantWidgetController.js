import { useCallback, useEffect, useRef, useState } from 'react';
import { MOBILE_BREAKPOINT } from '@constants/ui';
import assistantContent from '@data/assistant.json';
import { trackAssistantEvent } from '@utils/analytics';
import { isMobile } from '@utils/helpers';
import { useAssistantChat } from './useAssistantChat';
import { useAssistantLeadCapture } from './useAssistantLeadCapture';
import { useAssistantSecurity } from './useAssistantSecurity';

const LEAD_SOURCE = 'lead_capture';
const LEAD_DISMISS_MODES = {
  SESSION: 'session',
  TWO_DAYS: 'expiry',
};

function useMobileFullscreen() {
  const [mobileViewport, setMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isMobile();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = event => setMobileViewport(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return mobileViewport;
}

function getLeadAssistantMessage(content, extra = {}) {
  return { role: 'assistant', content, source: LEAD_SOURCE, ...extra };
}

function getLeadUserMessage(content) {
  return { role: 'user', content, source: LEAD_SOURCE };
}

function getLeadConfirmMessage(email, message) {
  return getLeadAssistantMessage(`Send this to ARG?\nEmail: ${email}\nMessage: ${message}`, {
    showConfirmButtons: true,
  });
}

function getPromptAction(prompt) {
  if (prompt === assistantContent.leadCaptureQuickPrompts[0]) return 'accept';
  if (prompt === assistantContent.leadCaptureQuickPrompts[1]) return 'chat';
  return null;
}

function getInputPlaceholder({ isLeadActive, leadStep, LEAD_STEPS }) {
  if (!isLeadActive) return assistantContent.placeholders.question;
  if (leadStep === LEAD_STEPS.OFFER) return assistantContent.placeholders.leadOffer;
  if (leadStep === LEAD_STEPS.EMAIL) return assistantContent.placeholders.email;
  if (leadStep === LEAD_STEPS.MESSAGE) return assistantContent.placeholders.message;
  if (leadStep === LEAD_STEPS.CONFIRM) return assistantContent.placeholders.leadConfirm;
  if (leadStep === LEAD_STEPS.SUBMITTING) return assistantContent.placeholders.leadSubmitting;
  if (leadStep === LEAD_STEPS.SUCCESS) return assistantContent.placeholders.leadSuccess;
  return assistantContent.placeholders.question;
}

export function useAssistantWidgetController({
  onOpenChange,
  reopenRequest = 0,
  leadCaptureVisible = false,
  onLeadCaptureDismiss,
  onLeadCaptureComplete,
}) {
  const mobileViewport = useMobileFullscreen();
  const [panelState, setPanelState] = useState('closed');
  const [inputValue, setInputValue] = useState('');
  const [leadMessages, setLeadMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const leadCaptureStartedRef = useRef(false);
  const leadDismissHandledRef = useRef(false);

  const isOpen = panelState !== 'closed';
  const { getPayload, consumePayload } = useAssistantSecurity({ isOpen });
  const { messages, loading, error, pendingStatus, setError, submitQuestion, resetChat } =
    useAssistantChat({ getPayload, consumePayload });

  const dismissLeadCaptureOnce = useCallback(
    (reopenAsChat = false, mode = LEAD_DISMISS_MODES.SESSION) => {
      if (leadDismissHandledRef.current) return;
      leadDismissHandledRef.current = true;
      onLeadCaptureDismiss?.({ reopenAsChat, mode });
    },
    [onLeadCaptureDismiss]
  );

  const handleHookDismiss = useCallback(
    () => dismissLeadCaptureOnce(true),
    [dismissLeadCaptureOnce]
  );

  const {
    leadStep,
    isActive: isLeadActive,
    capturedEmail,
    leadError,
    startLeadCapture,
    cancelLeadCapture,
    handleInput: handleLeadInput,
    submitLead,
    LEAD_STEPS,
  } = useAssistantLeadCapture({
    onDismiss: handleHookDismiss,
    onComplete: () => {
      setLeadMessages(prev => [
        ...prev.filter(message => !message.isLoading),
        getLeadAssistantMessage(assistantContent.messages.leadCaptureSuccess),
      ]);
      onLeadCaptureComplete?.();
    },
  });

  const showLeadPrompts = isLeadActive && leadStep === LEAD_STEPS.OFFER;
  const canClearConversation =
    messages.length > 0 || leadMessages.length > 0 || inputValue.length > 0 || Boolean(error);
  const inputPlaceholder = getInputPlaceholder({ isLeadActive, leadStep, LEAD_STEPS });
  const isInputDisabled = (loading && !isLeadActive) || leadStep === LEAD_STEPS.SUCCESS;
  const isSubmitDisabled = (loading && !isLeadActive) || !inputValue.trim();
  const isClearDisabled = loading || !canClearConversation;

  const addLeadResultMessages = useCallback(
    (result, userContent) => {
      const copy = assistantContent.messages;
      const userMessage = getLeadUserMessage(userContent);

      if (result.type === 'accepted') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(copy.leadCaptureEmail),
        ]);
      } else if (result.type === 'declined') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(copy.leadCaptureDeclined),
        ]);
      } else if (result.type === 'email_captured') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(copy.leadCaptureMessagePrompt),
        ]);
      } else if (result.type === 'lead_captured') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadConfirmMessage(result.email, result.message),
        ]);
      } else if (result.type === 'multiple_emails') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(copy.multipleEmails),
        ]);
      } else if (result.type === 'no_email_found') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(leadError || copy.noEmailFound),
        ]);
      } else if (result.type === 'message_skipped') {
        setLeadMessages(prev => [
          ...prev,
          getLeadUserMessage('skip'),
          getLeadConfirmMessage(capturedEmail, copy.noMessageAdded),
        ]);
      } else if (result.type === 'message_captured') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadConfirmMessage(capturedEmail, result.message),
        ]);
      } else if (result.type === 'cancelled') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(copy.leadCaptureCancelled),
        ]);
      } else if (result.type === 'submitting') {
        setLeadMessages(prev => [
          ...prev,
          getLeadUserMessage('send'),
          getLeadAssistantMessage(copy.sending, { isLoading: true }),
        ]);
      } else if (result.type === 'editing') {
        setLeadMessages(prev => [
          ...prev,
          getLeadUserMessage('edit'),
          getLeadAssistantMessage(copy.leadCaptureEmail),
        ]);
      } else if (result.type === 'empty') {
        setLeadMessages(prev => [
          ...prev,
          getLeadUserMessage('(empty)'),
          getLeadAssistantMessage(copy.emptyResponse),
        ]);
      } else if (result.type === 'unclear') {
        setLeadMessages(prev => [
          ...prev,
          userMessage,
          getLeadAssistantMessage(copy.leadCaptureUnclear),
        ]);
      }
    },
    [capturedEmail, leadError]
  );

  const submitCurrentLead = useCallback(async () => {
    const result = await submitLead();

    if (!result?.success) {
      setLeadMessages(prev => prev.filter(message => !message.isLoading));
    }
  }, [submitLead]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!leadCaptureVisible || panelState !== 'closed' || leadCaptureStartedRef.current) return;

    leadCaptureStartedRef.current = true;
    leadDismissHandledRef.current = false;
    const next = mobileViewport ? 'fullscreen' : 'open';

    requestAnimationFrame(() => {
      setPanelState(next);
      setError(null);
      startLeadCapture();
      setLeadMessages([getLeadAssistantMessage(assistantContent.messages.leadCaptureOffer)]);
      trackAssistantEvent('open', { source: LEAD_SOURCE });
    });
  }, [leadCaptureVisible, mobileViewport, panelState, startLeadCapture, setError]);

  useEffect(() => {
    if (!isLeadActive) return;

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [leadMessages, isLeadActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (panelState !== 'closed') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [panelState]);

  useEffect(() => {
    if (panelState !== 'fullscreen') return undefined;

    document.documentElement.classList.add('aw-fullscreen-open');
    return () => document.documentElement.classList.remove('aw-fullscreen-open');
  }, [panelState]);

  useEffect(() => {
    if (!reopenRequest) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPanelState(mobileViewport ? 'fullscreen' : 'open');
    setError(null);
  }, [mobileViewport, reopenRequest, setError]);

  const open = useCallback(
    source => {
      const next = mobileViewport ? 'fullscreen' : 'open';
      setPanelState(next);
      setError(null);
      trackAssistantEvent('open', { source });
    },
    [mobileViewport, setError]
  );

  const close = useCallback(
    source => {
      if (leadCaptureStartedRef.current && leadStep !== LEAD_STEPS.SUCCESS) {
        dismissLeadCaptureOnce(false);
      }
      setPanelState('closed');
      setError(null);
      cancelLeadCapture();
      setLeadMessages([]);
      leadCaptureStartedRef.current = false;
      leadDismissHandledRef.current = false;
      trackAssistantEvent('close', { source });
    },
    [setError, cancelLeadCapture, leadStep, LEAD_STEPS, dismissLeadCaptureOnce]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function handleGasparOpen(event) {
      open(event.detail?.source || 'external_request');
    }

    window.addEventListener('gaspar:open', handleGasparOpen);
    return () => window.removeEventListener('gaspar:open', handleGasparOpen);
  }, [open]);

  const startLeadCaptureFlow = useCallback(() => {
    if (panelState === 'closed') {
      setPanelState(mobileViewport ? 'fullscreen' : 'open');
    }
    leadCaptureStartedRef.current = true;
    leadDismissHandledRef.current = false;
    setError(null);
    startLeadCapture();
    setLeadMessages([getLeadAssistantMessage(assistantContent.messages.leadCaptureOffer)]);
    trackAssistantEvent('open', { source: LEAD_SOURCE });
  }, [panelState, mobileViewport, startLeadCapture, setError]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function handleStartLeadCapture() {
      startLeadCaptureFlow();
    }

    window.addEventListener('gaspar:start-lead-capture', handleStartLeadCapture);
    return () => window.removeEventListener('gaspar:start-lead-capture', handleStartLeadCapture);
  }, [startLeadCaptureFlow]);

  const toggleFullscreen = useCallback(() => {
    setPanelState(prev => (prev === 'fullscreen' ? 'open' : 'fullscreen'));
  }, []);

  const handleClearConversation = useCallback(() => {
    if (loading || leadStep === LEAD_STEPS.SUBMITTING) return;

    if (leadCaptureStartedRef.current && leadStep !== LEAD_STEPS.SUCCESS) {
      dismissLeadCaptureOnce(false);
    }
    resetChat();
    cancelLeadCapture();
    setLeadMessages([]);
    setInputValue('');
    setError(null);
    leadCaptureStartedRef.current = false;
    leadDismissHandledRef.current = false;
    trackAssistantEvent('clear_conversation', {
      had_history: messages.length > 0 || leadMessages.length > 0,
    });
  }, [
    loading,
    leadStep,
    LEAD_STEPS.SUBMITTING,
    LEAD_STEPS.SUCCESS,
    messages.length,
    leadMessages.length,
    resetChat,
    cancelLeadCapture,
    setError,
    dismissLeadCaptureOnce,
  ]);

  useEffect(() => {
    if (panelState === 'closed') return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') close('escape_key');
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelState, close]);

  const handleSubmit = useCallback(
    e => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || (loading && !isLeadActive)) return;

      if (isLeadActive) {
        const result = handleLeadInput(trimmed);
        addLeadResultMessages(result, trimmed);
        if (result.type === 'submitting') {
          submitCurrentLead();
        }
        setInputValue('');
        return;
      }

      trackAssistantEvent('submit', {
        has_history: messages.length > 0,
        question_length: trimmed.length,
      });
      setInputValue('');
      submitQuestion(trimmed);
    },
    [
      addLeadResultMessages,
      handleLeadInput,
      inputValue,
      isLeadActive,
      loading,
      messages.length,
      submitCurrentLead,
      submitQuestion,
    ]
  );

  const handleQuickPrompt = useCallback(
    prompt => {
      if (isLeadActive) {
        const action = getPromptAction(prompt);
        const result = handleLeadInput(prompt, action);
        addLeadResultMessages(result, prompt);
        setInputValue('');
        return;
      }

      trackAssistantEvent('quick_prompt', { prompt_text: prompt });
      trackAssistantEvent('submit', { has_history: false, question_length: prompt.length });
      setInputValue('');
      submitQuestion(prompt);
    },
    [addLeadResultMessages, handleLeadInput, isLeadActive, submitQuestion]
  );

  const handleLeadConfirm = useCallback(() => {
    if (leadStep === LEAD_STEPS.SUBMITTING) return;

    setLeadMessages(prev => [
      ...prev,
      getLeadUserMessage('send'),
      getLeadAssistantMessage(assistantContent.messages.sending, { isLoading: true }),
    ]);
    submitCurrentLead();
  }, [leadStep, LEAD_STEPS.SUBMITTING, submitCurrentLead]);

  const retrySubmit = useCallback(() => {
    if (leadStep === LEAD_STEPS.SUBMITTING) return;

    setLeadMessages(prev => [
      ...prev.filter(message => !message.isLoading),
      getLeadAssistantMessage(assistantContent.messages.sending, { isLoading: true }),
    ]);
    submitCurrentLead();
  }, [leadStep, LEAD_STEPS.SUBMITTING, submitCurrentLead]);

  const handleLeadEdit = useCallback(() => {
    handleLeadInput('edit');
    setLeadMessages(prev => [
      ...prev,
      getLeadUserMessage('edit'),
      getLeadAssistantMessage(assistantContent.messages.leadCaptureEmail),
    ]);
  }, [handleLeadInput]);

  const handleLeadCancel = useCallback(() => {
    handleLeadInput('cancel', 'cancel');
    dismissLeadCaptureOnce(false);
    setLeadMessages(prev => [
      ...prev,
      getLeadUserMessage('cancel'),
      getLeadAssistantMessage(assistantContent.messages.leadCaptureCancelled),
    ]);
  }, [handleLeadInput, dismissLeadCaptureOnce]);

  const handleLeadDismissForTwoDays = useCallback(() => {
    if (leadCaptureStartedRef.current && leadStep !== LEAD_STEPS.SUCCESS) {
      dismissLeadCaptureOnce(false, LEAD_DISMISS_MODES.TWO_DAYS);
    }

    setPanelState('closed');
    setError(null);
    cancelLeadCapture();
    setLeadMessages([]);
    leadCaptureStartedRef.current = false;
    leadDismissHandledRef.current = false;
    trackAssistantEvent('close', { source: 'lead_capture_dont_show_again' });
  }, [cancelLeadCapture, dismissLeadCaptureOnce, leadStep, LEAD_STEPS.SUCCESS, setError]);

  return {
    panelState,
    isOpen,
    inputValue,
    setInputValue,
    messages,
    leadMessages,
    loading,
    error,
    pendingStatus,
    leadStep,
    isLeadActive,
    mobileViewport,
    leadError,
    LEAD_STEPS,
    showLeadPrompts,
    canClearConversation,
    inputPlaceholder,
    isInputDisabled,
    isSubmitDisabled,
    isClearDisabled,
    messagesEndRef,
    inputRef,
    open,
    close,
    toggleFullscreen,
    handleClearConversation,
    handleSubmit,
    handleQuickPrompt,
    handleLeadConfirm,
    handleLeadEdit,
    handleLeadCancel,
    handleLeadDismissForTwoDays,
    retrySubmit,
  };
}
