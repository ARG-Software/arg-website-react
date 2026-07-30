import { useCallback, useEffect, useRef, useState } from 'react';
import { MOBILE_BREAKPOINT } from '@constants/ui';
import { trackAssistantEvent } from '@utils/analytics';
import { isMobile } from '@utils/helpers';
import { useAssistantChat } from './useAssistantChat';
import { useAssistantCopy } from './useAssistantCopy';
import { useAssistantLeadCapture } from './useAssistantLeadCapture';
import { useAssistantSecurity } from './useAssistantSecurity';
import {
  LEAD_DISMISS_MODES,
  getInputPlaceholder,
  getPanelStateForViewport,
  getPromptAction,
} from './utils/assistantUiState';
import {
  CHAT_SOURCE,
  LEAD_SOURCE,
  getLeadAssistantMessage,
  getLeadMessagesForResult,
} from './utils/leadMessages';

function getChatUserMessage(content) {
  return { role: 'user', content, source: CHAT_SOURCE };
}

function getChatAssistantMessage(message) {
  return { ...message, source: CHAT_SOURCE };
}

function getChatHistory(messages) {
  return messages
    .filter(message => message.source === CHAT_SOURCE)
    .map(({ role, content }) => ({ role, content }));
}

function shouldAutoStartLeadCapture(actions) {
  return actions?.some(action => action.type === 'gaspar_message' && action.autoStart) || false;
}

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
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const leadCaptureStartedRef = useRef(false);
  const leadDismissHandledRef = useRef(false);
  const { activeLanguage, assistantCopy, assistantDirection, setActiveLanguage } =
    useAssistantCopy();

  const isOpen = panelState !== 'closed';
  const { getPayload, consumePayload } = useAssistantSecurity({ isOpen });
  const { loading, error, pendingStatus, setError, submitQuestion, resetChat } = useAssistantChat({
    getPayload,
    consumePayload,
  });

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
    copy: assistantCopy,
    onDismiss: handleHookDismiss,
    onComplete: () => {
      setMessages(prev => [
        ...prev.filter(message => !message.isLoading),
        getLeadAssistantMessage(assistantCopy.messages.leadCaptureSuccess),
      ]);
      onLeadCaptureComplete?.();
    },
  });

  const showLeadPrompts = isLeadActive && leadStep === LEAD_STEPS.OFFER;
  const canClearConversation = messages.length > 0 || inputValue.length > 0 || Boolean(error);
  const inputPlaceholder = getInputPlaceholder({
    isLeadActive,
    leadStep,
    LEAD_STEPS,
    copy: assistantCopy,
  });
  const isInputDisabled = loading && !isLeadActive;
  const isSubmitDisabled = (loading && !isLeadActive) || !inputValue.trim();
  const isClearDisabled = loading || !canClearConversation;

  const addLeadResultMessages = useCallback(
    (result, userContent) => {
      setMessages(prev =>
        getLeadMessagesForResult(prev, result, {
          capturedEmail,
          copy: assistantCopy,
          leadError,
          userContent,
        })
      );
    },
    [assistantCopy, capturedEmail, leadError]
  );

  const startLeadCaptureFlow = useCallback(
    ({ skipOffer = false, copyOverride } = {}) => {
      const copy = copyOverride || assistantCopy;
      const initialStep = skipOffer ? LEAD_STEPS.EMAIL : undefined;
      const initialMessage = skipOffer
        ? copy.messages.leadCaptureEmail
        : copy.messages.leadCaptureOffer;

      if (panelState === 'closed') {
        setPanelState(getPanelStateForViewport(mobileViewport));
      }
      leadCaptureStartedRef.current = true;
      leadDismissHandledRef.current = false;
      setError(null);
      startLeadCapture(initialStep);
      setMessages(prev => [...prev, getLeadAssistantMessage(initialMessage)]);
      trackAssistantEvent('open', { source: LEAD_SOURCE });
    },
    [LEAD_STEPS.EMAIL, assistantCopy, panelState, mobileViewport, startLeadCapture, setError]
  );

  const submitChatMessage = useCallback(
    async question => {
      const chatHistory = getChatHistory(messages);

      setMessages(prev => [...prev, getChatUserMessage(question)]);

      const result = await submitQuestion(question, chatHistory);

      if (result?.success && result.message) {
        const nextCopy = result.message.language
          ? await setActiveLanguage(result.message.language)
          : assistantCopy;
        const assistantMessage = getChatAssistantMessage(result.message);

        setMessages(prev => [...prev, assistantMessage]);

        if (!isLeadActive && shouldAutoStartLeadCapture(assistantMessage.actions)) {
          startLeadCaptureFlow({ skipOffer: true, copyOverride: nextCopy });
        }
      }
    },
    [assistantCopy, isLeadActive, messages, setActiveLanguage, startLeadCaptureFlow, submitQuestion]
  );

  const submitCurrentLead = useCallback(async () => {
    const result = await submitLead();

    if (!result?.success) {
      setMessages(prev => prev.filter(message => !message.isLoading));
    }
  }, [submitLead]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!leadCaptureVisible || panelState !== 'closed' || leadCaptureStartedRef.current) return;

    leadCaptureStartedRef.current = true;
    leadDismissHandledRef.current = false;
    const next = getPanelStateForViewport(mobileViewport);

    requestAnimationFrame(() => {
      setPanelState(next);
      setError(null);
      startLeadCapture();
      setMessages(prev => [
        ...prev,
        getLeadAssistantMessage(assistantCopy.messages.leadCaptureOffer),
      ]);
      trackAssistantEvent('open', { source: LEAD_SOURCE });
    });
  }, [assistantCopy, leadCaptureVisible, mobileViewport, panelState, startLeadCapture, setError]);

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
    setPanelState(getPanelStateForViewport(mobileViewport));
    setError(null);
  }, [mobileViewport, reopenRequest, setError]);

  const open = useCallback(
    source => {
      setPanelState(getPanelStateForViewport(mobileViewport));
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function handleStartLeadCapture(event) {
      startLeadCaptureFlow({ skipOffer: Boolean(event.detail?.skipOffer) });
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
    setMessages([]);
    setInputValue('');
    setError(null);
    leadCaptureStartedRef.current = false;
    leadDismissHandledRef.current = false;
    trackAssistantEvent('clear_conversation', {
      had_history: messages.length > 0,
    });
  }, [
    loading,
    leadStep,
    LEAD_STEPS.SUBMITTING,
    LEAD_STEPS.SUCCESS,
    messages.length,
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

      const chatHistory = getChatHistory(messages);
      trackAssistantEvent('submit', {
        has_history: chatHistory.length > 0,
        question_length: trimmed.length,
      });
      setInputValue('');
      submitChatMessage(trimmed);
    },
    [
      addLeadResultMessages,
      handleLeadInput,
      inputValue,
      isLeadActive,
      loading,
      messages,
      submitCurrentLead,
      submitChatMessage,
    ]
  );

  const handleQuickPrompt = useCallback(
    (prompt, promptAction = null) => {
      if (isLeadActive) {
        const action = promptAction || getPromptAction(prompt, assistantCopy);
        const result = handleLeadInput(prompt, action);
        addLeadResultMessages(result, prompt);
        setInputValue('');
        return;
      }

      trackAssistantEvent('quick_prompt', { prompt_text: prompt });
      trackAssistantEvent('submit', { has_history: false, question_length: prompt.length });
      setInputValue('');
      submitChatMessage(prompt);
    },
    [addLeadResultMessages, assistantCopy, handleLeadInput, isLeadActive, submitChatMessage]
  );

  const handleLeadConfirm = useCallback(() => {
    if (leadStep === LEAD_STEPS.SUBMITTING) return;

    addLeadResultMessages({ type: 'submitting' });
    submitCurrentLead();
  }, [addLeadResultMessages, leadStep, LEAD_STEPS.SUBMITTING, submitCurrentLead]);

  const retrySubmit = useCallback(() => {
    if (leadStep === LEAD_STEPS.SUBMITTING) return;

    setMessages(prev => [
      ...prev.filter(message => !message.isLoading),
      getLeadAssistantMessage(assistantCopy.messages.sending, { isLoading: true }),
    ]);
    submitCurrentLead();
  }, [assistantCopy, leadStep, LEAD_STEPS.SUBMITTING, submitCurrentLead]);

  const handleLeadEdit = useCallback(() => {
    const result = handleLeadInput('edit', 'edit');
    addLeadResultMessages(result);
  }, [addLeadResultMessages, handleLeadInput]);

  const handleLeadCancel = useCallback(() => {
    handleLeadInput('cancel', 'cancel');
    dismissLeadCaptureOnce(false);
    cancelLeadCapture();
    addLeadResultMessages({ type: 'cancelled' }, assistantCopy.labels.cancel);
  }, [
    addLeadResultMessages,
    assistantCopy,
    cancelLeadCapture,
    handleLeadInput,
    dismissLeadCaptureOnce,
  ]);

  const handleLeadDismissForTwoDays = useCallback(() => {
    if (leadCaptureStartedRef.current && leadStep !== LEAD_STEPS.SUCCESS) {
      dismissLeadCaptureOnce(false, LEAD_DISMISS_MODES.TWO_DAYS);
    }

    setPanelState('closed');
    setError(null);
    cancelLeadCapture();
    leadCaptureStartedRef.current = false;
    leadDismissHandledRef.current = false;
    trackAssistantEvent('close', { source: 'lead_capture_dont_show_again' });
  }, [cancelLeadCapture, dismissLeadCaptureOnce, leadStep, LEAD_STEPS.SUCCESS, setError]);

  return {
    panelState,
    isOpen,
    activeLanguage,
    assistantCopy,
    assistantDirection,
    inputValue,
    setInputValue,
    messages,
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
