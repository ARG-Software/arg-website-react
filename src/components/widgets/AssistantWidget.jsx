import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@components/icons/Logo';
import { trackAssistantEvent } from '@utils/analytics';

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

function getErrorMessage(code) {
  const map = {
    question_required: 'Please enter a question.',
    question_too_long: 'Question must be 1000 characters or fewer.',
    answer_failed: 'Something went wrong. Please try again.',
    network_error: 'Unable to reach Gaspar. Please check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function useMobileFullscreen() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(max-width: 768px)');
    const onChange = event => setIsMobile(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export function AssistantWidget({ emailVisible }) {
  const isMobile = useMobileFullscreen();
  const [panelState, setPanelState] = useState('closed');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const showPrompts = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (panelState !== 'closed') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [panelState]);

  const open = useCallback(
    source => {
      const next = isMobile ? 'fullscreen' : 'open';
      setPanelState(next);
      setError(null);
      trackAssistantEvent('open', { source });
    },
    [isMobile]
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

      try {
        const response = await fetch('/.netlify/functions/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
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
          { role: 'user', content: trimmed },
          { role: 'assistant', content: data.answer, citations: data.citations || [] },
        ]);

        trackAssistantEvent('answer', {
          has_citations: (data.citations || []).length > 0,
          citation_count: (data.citations || []).length,
        });
      } catch {
        setError(getErrorMessage('network_error'));
        trackAssistantEvent('error', { error_code: 'network_error' });
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
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

  const isPanelOpen = panelState !== 'closed';

  return (
    <>
      <button
        className={`aw-trigger${emailVisible || isPanelOpen ? ' aw-trigger--hidden' : ''}`}
        onClick={() => open('trigger_button')}
        aria-label="Open Gaspar assistant"
        type="button"
      >
        <span className="aw-trigger__icon">
          <Logo />
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
              <Logo />
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
                    cit.url ? (
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
