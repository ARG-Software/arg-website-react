export function Chatbot({
  triggerImageSrc,
  triggerHidden = false,
  panelState = 'closed',
  isOpen = false,
  language,
  direction,
  copy,
  assistant,
  inputValue,
  inputPlaceholder,
  inputDisabled = false,
  submitDisabled = false,
  clearDisabled = false,
  showFullscreenToggle = true,
  darkMode = false,
  loading = false,
  error,
  pendingStatus,
  messages = [],
  welcomePrompts = [],
  leadPrompts = null,
  messagesEndRef,
  inputRef,
  onOpen,
  onClose,
  onClear,
  onToggleFullscreen,
  onToggleDarkMode,
  onInputChange,
  onSubmit,
  onQuickPrompt,
}) {
  return (
    <>
      <button
        className={`aw-trigger${triggerHidden ? ' aw-trigger--hidden' : ''}`}
        onClick={onOpen}
        aria-label={copy.labels.open}
        type="button"
      >
        <span className="aw-trigger__icon">
          <img src={triggerImageSrc} alt="" />
        </span>
      </button>

      <div
        className={`aw-panel${panelState === 'open' ? ' aw-panel--open' : ''}${panelState === 'fullscreen' ? ' aw-panel--open aw-panel--fullscreen' : ''}${darkMode ? ' aw-panel--dark' : ''}`}
        role="dialog"
        aria-label={copy.labels.dialog}
        aria-hidden={!isOpen}
        lang={language}
        dir={direction}
        data-lenis-prevent
      >
        <ChatbotHeader
          assistant={assistant}
          copy={copy}
          panelState={panelState}
          clearDisabled={clearDisabled}
          showFullscreenToggle={showFullscreenToggle}
          darkMode={darkMode}
          onClear={onClear}
          onClose={onClose}
          onToggleFullscreen={onToggleFullscreen}
          onToggleDarkMode={onToggleDarkMode}
        />

        <div className="aw-messages">
          {messages.length === 0 && !loading ? (
            <div className="aw-empty">
              <div className="aw-col">
                <p className="aw-empty__text">{copy.messages.welcome}</p>
                {welcomePrompts.length > 0 && (
                  <div className="aw-suggestions">
                    {welcomePrompts.map(prompt => (
                      <button
                        key={prompt.label}
                        className="aw-suggestion"
                        onClick={() =>
                          prompt.onClick ? prompt.onClick() : onQuickPrompt(prompt.label)
                        }
                        type="button"
                        disabled={prompt.disabled}
                      >
                        {prompt.label}
                        <span className="aw-suggestion__arrow" aria-hidden="true">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="aw-thread aw-col">
              {messages.map((message, index) => (
                <ChatbotMessage
                  key={`${message.source || 'chat'}-${index}`}
                  message={message}
                  avatarSrc={assistant.imageSrc}
                />
              ))}

              {loading && <PendingStatus message={pendingStatus} />}
            </div>
          )}
          {/* Last child of the scroll area, below the thread padding, so scrolling to it reaches the very bottom */}
          <div ref={messagesEndRef} />
        </div>

        <div className="aw-footer">
          <div className="aw-col">
            {leadPrompts && <PromptList {...leadPrompts} />}
            {error && <div className="aw-error">{error}</div>}

            <form className="aw-composer" onSubmit={onSubmit}>
              <div className="aw-input-wrap">
                {/* Enter sends, Shift+Enter adds a line; the data-* attributes keep grammar extensions from badging the box */}
                <textarea
                  ref={inputRef}
                  className="aw-input"
                  rows={1}
                  placeholder={inputPlaceholder}
                  value={inputValue}
                  onChange={event => onInputChange(event.target.value)}
                  onKeyDown={event => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
                      return;
                    }
                    event.preventDefault();
                    if (!submitDisabled) event.currentTarget.form.requestSubmit();
                  }}
                  disabled={inputDisabled}
                  data-gramm="false"
                  data-enable-grammarly="false"
                  data-lt-active="false"
                />
                <button
                  className="aw-send"
                  type="submit"
                  disabled={submitDisabled}
                  aria-label={copy.labels.sendQuestion}
                >
                  <SendIcon />
                </button>
              </div>
            </form>

            <div className="aw-meta">
              <a href="https://altcha.org" target="_blank" rel="noopener noreferrer">
                Protected by ALTCHA
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChatbotHeader({
  assistant,
  copy,
  panelState,
  clearDisabled,
  showFullscreenToggle,
  darkMode,
  onClear,
  onClose,
  onToggleFullscreen,
  onToggleDarkMode,
}) {
  const themeLabel = darkMode ? copy.labels.lightMode : copy.labels.darkMode;
  const fullscreenLabel = panelState === 'fullscreen' ? copy.labels.minimize : copy.labels.expand;

  return (
    <div className="aw-header">
      <div className="aw-header__left">
        <div className="aw-header__avatar">
          <img src={assistant.imageSrc} alt="" />
        </div>
        <div className="aw-header__title">{assistant.name}</div>
      </div>
      <div className="aw-header__controls">
        <button
          className="aw-header__btn"
          onClick={onToggleDarkMode}
          aria-label={themeLabel}
          aria-pressed={darkMode}
          data-tooltip={themeLabel}
          type="button"
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          className="aw-header__btn"
          onClick={onClear}
          aria-label={copy.labels.clear}
          data-tooltip={copy.labels.clear}
          type="button"
          disabled={clearDisabled}
        >
          <TrashIcon />
        </button>
        <span className="aw-header__divider" aria-hidden="true" />
        {showFullscreenToggle && (
          <button
            className="aw-header__btn"
            onClick={onToggleFullscreen}
            aria-label={fullscreenLabel}
            data-tooltip={fullscreenLabel}
            type="button"
          >
            {panelState === 'fullscreen' ? <MinimizeIcon /> : <ExpandIcon />}
          </button>
        )}
        <button
          className="aw-header__btn"
          onClick={onClose}
          aria-label={copy.labels.close}
          data-tooltip={copy.labels.close}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function ChatbotMessage({ message, avatarSrc }) {
  const isAssistant = message.role === 'assistant';
  const className = isAssistant
    ? 'aw-message aw-message--assistant'
    : 'aw-message aw-message--user';

  return (
    <div className={className}>
      {isAssistant && <img className="aw-message__avatar" src={avatarSrc} alt="" />}
      <div className="aw-message__body">
        <p style={message.preserveWhitespace ? { whiteSpace: 'pre-line' } : undefined}>
          {message.content}
        </p>
        {message.links?.length > 0 && (
          <div className="aw-source-links" aria-label={message.linksLabel}>
            {message.links.map(link => link.node)}
          </div>
        )}
        {message.actions?.length > 0 && (
          <div className="aw-actions">{message.actions.map(action => action.node)}</div>
        )}
        {message.pendingMessage && <PendingStatus message={message.pendingMessage} />}
      </div>
    </div>
  );
}

function PromptList({ prompts = [], onQuickPrompt, disabled = false }) {
  return (
    <div className="aw-prompts">
      {prompts.map(prompt => (
        <button
          key={prompt.label}
          className={`aw-prompt${prompt.muted ? ' aw-prompt--muted' : ''}`}
          onClick={() => (prompt.onClick ? prompt.onClick() : onQuickPrompt(prompt.label))}
          type="button"
          disabled={disabled || prompt.disabled}
        >
          {prompt.label}
        </button>
      ))}
    </div>
  );
}

function PendingStatus({ message }) {
  return (
    <div className="aw-pending" aria-live="polite">
      <div className="aw-typing">
        <span className="aw-typing__dot" />
        <span className="aw-typing__dot" />
        <span className="aw-typing__dot" />
      </div>
      {message && <div className="aw-pending__text">{message}</div>}
    </div>
  );
}

function MoonIcon() {
  return (
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function TrashIcon() {
  return (
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
  );
}

function ExpandIcon() {
  return (
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
  );
}

function MinimizeIcon() {
  return (
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
  );
}

function CloseIcon() {
  return (
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
  );
}

function SendIcon() {
  return (
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
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
