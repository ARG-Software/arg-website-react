import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOBILE_BREAKPOINT } from '@constants/ui';
import { useAssistantChat } from '@hooks/useAssistantChat';
import { useAssistantLeadCapture } from '@hooks/useAssistantLeadCapture';
import { useAssistantSecurity } from '@hooks/useAssistantSecurity';
import { getMailtoLink, getProjectBookingLink } from '@services/linksservice';
import { trackAssistantEvent } from '@utils/analytics';
import { isMobile } from '@utils/helpers';
import { AssistantPendingStatus } from './AssistantPendingStatus';

const GASPAR_IMAGE_SRC = '/images/ai/gaspar.png';

const QUICK_PROMPTS = [
  'What does ARG do?',
  'Latest articles?',
  'How can I work with ARG?',
  'Are you hiring?',
];

const LEAD_CAPTURE_QUICK_PROMPTS = [
  'Yes, send email',
  "No, don't show again",
  'Ask Gaspar instead',
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi, I'm Gaspar, ARG's AI assistant. Ask me about our work, our research, or how to get in touch.",
};

const LEAD_CAPTURE_OFFER_MESSAGE = {
  role: 'assistant',
  content: 'Want to send ARG a quick email? I can collect your email and message here.',
  source: 'lead_capture',
};

const LEAD_CAPTURE_EMAIL_MESSAGE = {
  role: 'assistant',
  content: 'What email should we reply to?',
  source: 'lead_capture',
};

const LEAD_CAPTURE_MESSAGE_PROMPT = {
  role: 'assistant',
  content: 'Want to add a message? You can also say "skip".',
  source: 'lead_capture',
};

const LEAD_CAPTURE_SUCCESS_MESSAGE = {
  role: 'assistant',
  content: "Done. We'll reply within 48h. Thanks for reaching out!",
  source: 'lead_capture',
};

const ASSISTANT_ACTIONS = {
  book_meeting: {
    label: 'Book a meeting',
    href: getProjectBookingLink(),
    external: true,
  },
  email_hello: {
    label: 'Email us',
    href: getMailtoLink('hello', 'Project enquiry'),
    external: false,
  },
  email_hr: {
    label: 'Email careers team',
    href: getMailtoLink('hr', 'Career enquiry'),
    external: false,
  },
};

function getInternalAssistantPath(url) {
  try {
    const destination = new URL(url, window.location.origin);
    const siteOrigin = 'https://arg.software';

    if (destination.origin !== window.location.origin && destination.origin !== siteOrigin) {
      return null;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function getAssistantLinks(message) {
  const links = [];
  const seen = new Set();

  for (const article of message.articleRecommendations || []) {
    addAssistantLink(links, seen, {
      type: 'article',
      title: article.title,
      url: article.url,
    });
  }

  for (const citation of message.citations || []) {
    addAssistantLink(links, seen, {
      type: 'citation',
      title: citation.title,
      url: citation.url,
      sourceType: citation.sourceType,
      sourceKey: citation.sourceKey,
    });
  }

  return links;
}

function addAssistantLink(links, seen, link) {
  const key = `${link.url || ''}:${link.title || ''}`.toLowerCase();

  if (!link.title || seen.has(key)) {
    return;
  }

  seen.add(key);
  links.push(link);
}

function trackAssistantLinkClick(link) {
  if (link.type === 'article') {
    trackAssistantEvent('article_recommendation_click', {
      article_title: link.title,
    });
    return;
  }

  trackAssistantEvent('citation_click', {
    source_type: link.sourceType,
    source_key: link.sourceKey,
  });
}

function AssistantLinkList({ links }) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="aw-source-links" aria-label="Related links">
      {links.map(link => {
        const internalPath = link.url ? getInternalAssistantPath(link.url) : null;
        const onClick = () => trackAssistantLinkClick(link);

        return internalPath ? (
          <Link
            key={`${link.url}-${link.title}`}
            className="aw-source-link"
            to={internalPath}
            onClick={onClick}
          >
            {link.title}
          </Link>
        ) : link.url ? (
          <a
            key={`${link.url}-${link.title}`}
            className="aw-source-link"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
          >
            {link.title}
          </a>
        ) : (
          <span key={link.title} className="aw-source-link aw-source-link--static">
            {link.title}
          </span>
        );
      })}
    </div>
  );
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

export function AssistantWidget({
  onOpenChange,
  reopenRequest = 0,
  leadCaptureVisible = false,
  onLeadCaptureDismiss,
}) {
  const mobileViewport = useMobileFullscreen();
  const [panelState, setPanelState] = useState('closed');
  const [inputValue, setInputValue] = useState('');
  const [leadMessages, setLeadMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const leadCaptureStartedRef = useRef(false);

  const isOpen = panelState !== 'closed';
  const { getPayload, consumePayload } = useAssistantSecurity({ isOpen });
  const { messages, loading, error, pendingStatus, setError, submitQuestion, resetChat } =
    useAssistantChat({ getPayload, consumePayload });

  const {
    leadStep,
    isActive: isLeadActive,
    capturedEmail,
    capturedMessage,
    errorMessage: leadErrorMessage,
    startLeadCapture,
    cancelLeadCapture,
    declineLeadCapture,
    handleInput: handleLeadInput,
    submitLead,
    retrySubmit,
    LEAD_STEPS,
  } = useAssistantLeadCapture({
    onDismiss: onLeadCaptureDismiss,
    onComplete: () => {
      cancelLeadCapture();
      setLeadMessages([]);
      leadCaptureStartedRef.current = false;
    },
  });

  const showPrompts = !isLeadActive && messages.length === 0;
  const showLeadPrompts = isLeadActive && leadStep === LEAD_STEPS.OFFER;
  const canClearConversation =
    !isLeadActive && (messages.length > 0 || inputValue.length > 0 || Boolean(error));

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!leadCaptureVisible || panelState !== 'closed' || leadCaptureStartedRef.current) return;

    leadCaptureStartedRef.current = true;
    const next = mobileViewport ? 'fullscreen' : 'open';

    requestAnimationFrame(() => {
      setPanelState(next);
      setError(null);
      startLeadCapture();
      setLeadMessages([LEAD_CAPTURE_OFFER_MESSAGE]);
      trackAssistantEvent('open', { source: 'lead_capture' });
    });
  }, [leadCaptureVisible, mobileViewport, startLeadCapture, setError]);

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
      setPanelState('closed');
      setError(null);
      cancelLeadCapture();
      setLeadMessages([]);
      leadCaptureStartedRef.current = false;
      trackAssistantEvent('close', { source });
    },
    [setError, cancelLeadCapture]
  );

  useEffect(() => {
    function handleGasparOpen(event) {
      open(event.detail?.source || 'external_request');
    }

    window.addEventListener('gaspar:open', handleGasparOpen);
    return () => window.removeEventListener('gaspar:open', handleGasparOpen);
  }, [open]);

  const toggleFullscreen = useCallback(() => {
    setPanelState(prev => (prev === 'fullscreen' ? 'open' : 'fullscreen'));
  }, []);

  const handleClearConversation = useCallback(() => {
    if (loading || isLeadActive) return;

    resetChat();
    setInputValue('');
    trackAssistantEvent('clear_conversation', { had_history: messages.length > 0 });
  }, [loading, messages.length, resetChat, isLeadActive]);

  useEffect(() => {
    if (panelState === 'closed') return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') close('escape_key');
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelState, close]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || (loading && !isLeadActive)) return;

    if (isLeadActive) {
      const result = handleLeadInput(trimmed);

      if (result.type === 'accepted') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          LEAD_CAPTURE_EMAIL_MESSAGE,
        ]);
      } else if (result.type === 'declined') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          {
            role: 'assistant',
            content:
              "No problem. I won't show this again for 2 days. Feel free to ask me anything else.",
            source: 'lead_capture',
          },
        ]);
        setTimeout(() => {
          setLeadMessages([]);
          leadCaptureStartedRef.current = false;
        }, 3000);
      } else if (result.type === 'email_captured') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          LEAD_CAPTURE_MESSAGE_PROMPT,
        ]);
      } else if (result.type === 'multiple_emails') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          {
            role: 'assistant',
            content: 'I found multiple emails. Please enter just one email address.',
            source: 'lead_capture',
          },
        ]);
      } else if (result.type === 'no_email_found') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          {
            role: 'assistant',
            content: "I couldn't find a valid email address. Please enter your email.",
            source: 'lead_capture',
          },
        ]);
      } else if (result.type === 'message_skipped') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: 'skip', source: 'lead_capture' },
          {
            role: 'assistant',
            content: `Send this to ARG?\nEmail: ${capturedEmail}\nMessage: No message added.`,
            source: 'lead_capture',
            showConfirmButtons: true,
          },
        ]);
      } else if (result.type === 'message_captured') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          {
            role: 'assistant',
            content: `Send this to ARG?\nEmail: ${capturedEmail}\nMessage: ${result.message}`,
            source: 'lead_capture',
            showConfirmButtons: true,
          },
        ]);
      } else if (result.type === 'cancelled') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed, source: 'lead_capture' },
          {
            role: 'assistant',
            content: 'No problem. Feel free to ask me anything else.',
            source: 'lead_capture',
          },
        ]);
        setTimeout(() => {
          setLeadMessages([]);
          leadCaptureStartedRef.current = false;
        }, 3000);
      } else if (result.type === 'submitting') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: 'send', source: 'lead_capture' },
          { role: 'assistant', content: 'Sending...', source: 'lead_capture', isLoading: true },
        ]);
      } else if (result.type === 'editing') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: 'edit', source: 'lead_capture' },
          LEAD_CAPTURE_EMAIL_MESSAGE,
        ]);
      } else if (result.type === 'empty') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: '(empty)', source: 'lead_capture' },
          { role: 'assistant', content: 'Please enter a valid response.', source: 'lead_capture' },
        ]);
      }

      setInputValue('');
      return;
    }

    trackAssistantEvent('submit', {
      has_history: messages.length > 0,
      question_length: inputValue.length,
    });
    submitQuestion(inputValue).then(() => setInputValue(''));
  }

  function handleQuickPrompt(prompt) {
    if (isLeadActive) {
      const result = handleLeadInput(prompt.toLowerCase());

      if (result.type === 'accepted') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: prompt, source: 'lead_capture' },
          LEAD_CAPTURE_EMAIL_MESSAGE,
        ]);
      } else if (result.type === 'declined') {
        setLeadMessages(prev => [
          ...prev,
          { role: 'user', content: prompt, source: 'lead_capture' },
          {
            role: 'assistant',
            content:
              "No problem. I won't show this again for 2 days. Feel free to ask me anything else.",
            source: 'lead_capture',
          },
        ]);
        setTimeout(() => {
          setLeadMessages([]);
          leadCaptureStartedRef.current = false;
        }, 3000);
      }

      setInputValue('');
      return;
    }

    trackAssistantEvent('quick_prompt', { prompt_text: prompt });
    trackAssistantEvent('submit', { has_history: false, question_length: prompt.length });
    submitQuestion(prompt).then(() => setInputValue(''));
  }

  function handleLeadConfirm() {
    submitLead();
    setLeadMessages(prev => [
      ...prev,
      { role: 'user', content: 'send', source: 'lead_capture' },
      { role: 'assistant', content: 'Sending...', source: 'lead_capture', isLoading: true },
    ]);
  }

  function handleLeadEdit() {
    handleLeadInput('edit');
    setLeadMessages(prev => [
      ...prev,
      { role: 'user', content: 'edit', source: 'lead_capture' },
      LEAD_CAPTURE_EMAIL_MESSAGE,
    ]);
  }

  function handleLeadCancel() {
    handleLeadInput('cancel');
    setLeadMessages(prev => [
      ...prev,
      { role: 'user', content: 'cancel', source: 'lead_capture' },
      {
        role: 'assistant',
        content: 'No problem. Feel free to ask me anything else.',
        source: 'lead_capture',
      },
    ]);
    setTimeout(() => {
      setLeadMessages([]);
      leadCaptureStartedRef.current = false;
    }, 3000);
  }

  return (
    <>
      <button
        className={`aw-trigger${isOpen ? ' aw-trigger--hidden' : ''}`}
        onClick={() => open('trigger_button')}
        aria-label="Open Gaspar assistant"
        type="button"
      >
        <span className="aw-trigger__icon">
          <img src={GASPAR_IMAGE_SRC} alt="" />
        </span>
      </button>

      <div
        className={`aw-panel${panelState === 'open' ? ' aw-panel--open' : ''}${panelState === 'fullscreen' ? ' aw-panel--open aw-panel--fullscreen' : ''}`}
        role="dialog"
        aria-label="Gaspar assistant"
        aria-hidden={!isOpen}
        data-lenis-prevent
      >
        <div className="aw-header">
          <div className="aw-header__left">
            <div className="aw-header__avatar">
              <img src={GASPAR_IMAGE_SRC} alt="" />
            </div>
            <div>
              <div className="aw-header__title">Gaspar</div>
              <div className="aw-header__status">
                <span className="aw-header__dot" />
                online now
              </div>
            </div>
          </div>
          <div className="aw-header__controls">
            <button
              className="aw-header__btn"
              onClick={handleClearConversation}
              aria-label="Clear conversation"
              type="button"
              disabled={loading || !canClearConversation}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M8 6V4h8v2M7 6l1 14h8l1-14" />
              </svg>
            </button>
            {panelState !== 'fullscreen' && (
              <button
                className="aw-header__btn"
                onClick={toggleFullscreen}
                aria-label="Expand to fullscreen"
                type="button"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
            {panelState === 'fullscreen' && (
              <button
                className="aw-header__btn"
                onClick={toggleFullscreen}
                aria-label="Minimize to panel"
                type="button"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              </button>
            )}
            <button
              className="aw-header__btn"
              onClick={() => close('close_button')}
              aria-label="Close assistant"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="aw-messages">
          <div className="aw-message aw-message--welcome">
            <p>{WELCOME_MESSAGE.content}</p>
          </div>

          {isLeadActive ? (
            <>
              {leadMessages.map((msg, i) => (
                <div key={`lead-${i}`} className={`aw-message aw-message--${msg.role}`}>
                  <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
                  {msg.showConfirmButtons && (
                    <div className="aw-actions">
                      <button
                        className="aw-action"
                        onClick={handleLeadConfirm}
                        type="button"
                        disabled={leadStep === LEAD_STEPS.SUBMITTING}
                      >
                        Send
                      </button>
                      <button
                        className="aw-action"
                        onClick={handleLeadEdit}
                        type="button"
                        disabled={leadStep === LEAD_STEPS.SUBMITTING}
                      >
                        Edit
                      </button>
                      <button
                        className="aw-action"
                        onClick={handleLeadCancel}
                        type="button"
                        disabled={leadStep === LEAD_STEPS.SUBMITTING}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {msg.isLoading && <AssistantPendingStatus message="Sending..." />}
                </div>
              ))}
              {leadStep === LEAD_STEPS.ERROR && (
                <div className="aw-message aw-message--assistant">
                  <p>{leadErrorMessage}</p>
                  <div className="aw-actions">
                    <button className="aw-action" onClick={retrySubmit} type="button">
                      Try Again
                    </button>
                    <button className="aw-action" onClick={handleLeadCancel} type="button">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {leadStep === LEAD_STEPS.SUCCESS && (
                <div className="aw-message aw-message--assistant">
                  <p>{LEAD_CAPTURE_SUCCESS_MESSAGE.content}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`aw-message aw-message--${msg.role}`}>
                  <p>{msg.content}</p>
                  <AssistantLinkList links={getAssistantLinks(msg)} />
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="aw-actions">
                      {msg.actions.map((action, ai) => {
                        const details = ASSISTANT_ACTIONS[action.type];

                        if (!details) return null;

                        return (
                          <a
                            key={`${action.type}-${ai}`}
                            className="aw-action"
                            href={details.href}
                            {...(details.external
                              ? { target: '_blank', rel: 'noopener noreferrer' }
                              : {})}
                            onClick={() =>
                              trackAssistantEvent('action_click', { action_type: action.type })
                            }
                          >
                            {details.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {loading && <AssistantPendingStatus message={pendingStatus} />}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showPrompts && (
          <div className="aw-prompts">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                className="aw-prompt"
                onClick={() => handleQuickPrompt(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {showLeadPrompts && (
          <div className="aw-prompts">
            {LEAD_CAPTURE_QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                className="aw-prompt"
                onClick={() => handleQuickPrompt(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {error && !isLeadActive && <div className="aw-error">{error}</div>}

        <form className="aw-input-area" onSubmit={handleSubmit}>
          <div className="aw-input-wrap">
            <input
              ref={inputRef}
              className="aw-input"
              type="text"
              placeholder={
                isLeadActive
                  ? leadStep === LEAD_STEPS.EMAIL
                    ? 'Enter your email...'
                    : leadStep === LEAD_STEPS.MESSAGE
                      ? 'Enter your message or "skip"...'
                      : leadStep === LEAD_STEPS.CONFIRM
                        ? 'Type "send" to confirm...'
                        : 'Ask a question...'
                  : 'Ask a question...'
              }
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={loading && !isLeadActive}
            />
            <button
              className="aw-send"
              type="submit"
              disabled={(loading && !isLeadActive) || !inputValue.trim()}
              aria-label={isLeadActive ? 'Send response' : 'Send question'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </form>

        <div className="aw-altcha-badge">
          <a href="https://altcha.org" target="_blank" rel="noopener noreferrer">
            Protected by ALTCHA
          </a>
        </div>
      </div>
    </>
  );
}
