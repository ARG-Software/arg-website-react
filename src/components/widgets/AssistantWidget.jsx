import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MOBILE_BREAKPOINT } from '@constants/ui';
import { useActiveHomepageSection } from '@hooks/useActiveHomepageSection';
import { getMailtoLink, getProjectBookingLink } from '@services/linksservice';
import { trackAssistantEvent } from '@utils/analytics';
import { isMobile } from '@utils/helpers';

const GASPAR_IMAGE_SRC = '/images/ai/gaspar.png';

const QUICK_PROMPTS = [
  'What does ARG do?',
  'Latest articles?',
  'How can I work with ARG?',
  'Are you hiring?',
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi, I'm Gaspar, ARG's AI assistant. Ask me about our work, our research, or how to get in touch.",
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

const ERROR_MESSAGES = {
  en: {
    question_required: 'Please enter a question.',
    question_too_long: 'Question must be 1000 characters or fewer.',
    configuration_error: 'Gaspar is temporarily unavailable. Please try again later.',
    embedding_quota_exceeded: 'Gaspar is temporarily unavailable. Please try again later.',
    answer_failed: 'Something went wrong. Please try again.',
    network_error: 'Unable to reach Gaspar. Please check your connection.',
    request_timeout: 'Gaspar is taking too long to respond. Please try again.',
  },
  pt: {
    question_required: 'Introduza uma pergunta.',
    question_too_long: 'A pergunta tem de ter no maximo 1000 caracteres.',
    configuration_error: 'O Gaspar esta temporariamente indisponivel. Tente novamente mais tarde.',
    embedding_quota_exceeded:
      'O Gaspar esta temporariamente indisponivel. Tente novamente mais tarde.',
    answer_failed: 'Algo correu mal. Tente novamente.',
    network_error: 'Nao foi possivel contactar o Gaspar. Verifique a sua ligacao.',
    request_timeout: 'O Gaspar esta a demorar demasiado a responder. Tente novamente.',
  },
};

function getErrorMessage(code) {
  const locale = typeof navigator === 'undefined' ? 'en' : navigator.language.toLowerCase();
  const messages = locale.startsWith('pt') ? ERROR_MESSAGES.pt : ERROR_MESSAGES.en;

  return messages[code] || messages.answer_failed;
}

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

export function AssistantWidget({ isSuppressed = false, onOpenChange, reopenRequest = 0 }) {
  const location = useLocation();
  const activeSection = useActiveHomepageSection(location.pathname);
  const mobileViewport = useMobileFullscreen();
  const [panelState, setPanelState] = useState('closed');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const showPrompts = messages.length === 0;
  const isPanelOpen = panelState !== 'closed';

  useEffect(() => {
    onOpenChange?.(isPanelOpen);
  }, [isPanelOpen, onOpenChange]);

  useEffect(() => {
    if (!isSuppressed || panelState === 'closed') return;

    setPanelState('closed');
    setError(null);
  }, [isSuppressed, panelState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (panelState !== 'closed') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [panelState]);

  useEffect(() => {
    if (!reopenRequest || isSuppressed) return;

    setPanelState(mobileViewport ? 'fullscreen' : 'open');
    setError(null);
  }, [isSuppressed, mobileViewport, reopenRequest]);

  const open = useCallback(
    source => {
      if (isSuppressed) return;

      const next = mobileViewport ? 'fullscreen' : 'open';
      setPanelState(next);
      setError(null);
      trackAssistantEvent('open', { source });
    },
    [mobileViewport, isSuppressed]
  );

  const close = useCallback(source => {
    setPanelState('closed');
    setError(null);
    trackAssistantEvent('close', { source });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setPanelState(prev => (prev === 'fullscreen' ? 'open' : 'fullscreen'));
  }, []);

  useEffect(() => {
    if (panelState === 'closed') return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') close('escape_key');
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelState, close]);

  const submitQuestion = useCallback(
    async question => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setError(null);
      setInputValue('');
      setMessages(prev => [...prev, { role: 'user', content: trimmed }]);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch('/.netlify/functions/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            question: trimmed,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            pageContext: {
              pathname: location.pathname,
              title: document.title,
              ...(activeSection ? { activeSection } : {}),
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const code = data.error?.code || 'answer_failed';
          setError(getErrorMessage(code));
          trackAssistantEvent('error', { error_code: code });
          return;
        }

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            citations: data.citations || [],
            articleRecommendations: data.articleRecommendations || [],
            actions: data.actions || [],
          },
        ]);

        trackAssistantEvent('answer', {
          has_citations: (data.citations || []).length > 0,
          citation_count: (data.citations || []).length,
          action_count: (data.actions || []).length,
        });
      } catch (error) {
        const code = error.name === 'AbortError' ? 'request_timeout' : 'network_error';
        setError(getErrorMessage(code));
        trackAssistantEvent('error', { error_code: code });
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    },
    [activeSection, loading, location.pathname, messages]
  );

  function handleSubmit(e) {
    e.preventDefault();
    trackAssistantEvent('submit', {
      has_history: messages.length > 0,
      question_length: inputValue.length,
    });
    submitQuestion(inputValue);
  }

  function handleQuickPrompt(prompt) {
    trackAssistantEvent('quick_prompt', { prompt_text: prompt });
    trackAssistantEvent('submit', { has_history: false, question_length: prompt.length });
    submitQuestion(prompt);
  }

  return (
    <>
      <button
        className={`aw-trigger${isSuppressed || isPanelOpen ? ' aw-trigger--hidden' : ''}`}
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
        aria-hidden={!isPanelOpen}
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
                  <path d="M15 3h6v6M9 21H3v6M21 3l-7 7M3 21l7-7" />
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

          {messages.map((msg, i) => (
            <div key={i} className={`aw-message aw-message--${msg.role}`}>
              <p>{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="aw-citations">
                  {msg.citations.map((cit, ci) =>
                    cit.url && getInternalAssistantPath(cit.url) ? (
                      <Link
                        key={ci}
                        className="aw-citation"
                        to={getInternalAssistantPath(cit.url)}
                        onClick={() =>
                          trackAssistantEvent('citation_click', {
                            source_type: cit.sourceType,
                            source_key: cit.sourceKey,
                          })
                        }
                      >
                        {cit.title}
                      </Link>
                    ) : cit.url ? (
                      <a
                        key={ci}
                        className="aw-citation"
                        href={cit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAssistantEvent('citation_click', {
                            source_type: cit.sourceType,
                            source_key: cit.sourceKey,
                          })
                        }
                      >
                        {cit.title}
                      </a>
                    ) : (
                      <span key={ci} className="aw-citation">
                        {cit.title}
                      </span>
                    )
                  )}
                </div>
              )}
              {msg.articleRecommendations && msg.articleRecommendations.length > 0 && (
                <div className="aw-article-recommendations">
                  <span className="aw-article-recommendations__label">Read more</span>
                  {msg.articleRecommendations.map(article => {
                    const internalPath = getInternalAssistantPath(article.url);
                    const onClick = () =>
                      trackAssistantEvent('article_recommendation_click', {
                        article_title: article.title,
                      });

                    return internalPath ? (
                      <Link
                        key={article.url}
                        className="aw-article-recommendation"
                        to={internalPath}
                        onClick={onClick}
                      >
                        {article.title}
                      </Link>
                    ) : (
                      <a
                        key={article.url}
                        className="aw-article-recommendation"
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClick}
                      >
                        {article.title}
                      </a>
                    );
                  })}
                </div>
              )}
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

          {loading && (
            <div className="aw-typing">
              <span className="aw-typing__dot" />
              <span className="aw-typing__dot" />
              <span className="aw-typing__dot" />
            </div>
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

        {error && <div className="aw-error">{error}</div>}

        <form className="aw-input-area" onSubmit={handleSubmit}>
          <div className="aw-input-wrap">
            <input
              ref={inputRef}
              className="aw-input"
              type="text"
              placeholder="Ask a question..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={loading}
            />
            <button
              className="aw-send"
              type="submit"
              disabled={loading || !inputValue.trim()}
              aria-label="Send question"
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
      </div>
    </>
  );
}
