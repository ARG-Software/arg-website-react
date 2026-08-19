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
        className={`aw-panel${panelState === 'open' ? ' aw-panel--open' : ''}${panelState === 'fullscreen' ? ' aw-panel--open aw-panel--fullscreen' : ''}`}
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
          onClear={onClear}
          onClose={onClose}
          onToggleFullscreen={onToggleFullscreen}
        />

        <div className="aw-messages">
          <div className="aw-message aw-message--welcome">
            <p>{copy.messages.welcome}</p>
            {welcomePrompts.length > 0 && (
              <PromptList
                prompts={welcomePrompts}
                onQuickPrompt={onQuickPrompt}
                disabled={loading}
                inline
              />
            )}
          </div>

          {messages.map((message, index) => (
            <ChatbotMessage key={`${message.source || 'chat'}-${index}`} message={message} />
          ))}

          {loading && <PendingStatus message={pendingStatus} />}
          <div ref={messagesEndRef} />
        </div>

        {leadPrompts && <PromptList {...leadPrompts} />}
        {error && <div className="aw-error">{error}</div>}

        <form className="aw-input-area" onSubmit={onSubmit}>
          <div className="aw-input-wrap">
            <input
              ref={inputRef}
              className="aw-input"
              type="text"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={event => onInputChange(event.target.value)}
              disabled={inputDisabled}
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

        <div className="aw-altcha-badge">
          <a href="https://altcha.org" target="_blank" rel="noopener noreferrer">
            Protected by ALTCHA
          </a>
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
  onClear,
  onClose,
  onToggleFullscreen,
}) {
  return (
    <div className="aw-header">
      <div className="aw-header__left">
        <div className="aw-header__avatar">
          <img src={assistant.imageSrc} alt="" />
        </div>
        <div>
          <div className="aw-header__title">{assistant.name}</div>
          <div className="aw-header__status">
            <span className="aw-header__dot" />
            {copy.statusText}
          </div>
        </div>
      </div>
      <div className="aw-header__controls">
        <button
          className="aw-header__btn"
          onClick={onClear}
          aria-label={copy.labels.clear}
          type="button"
          disabled={clearDisabled}
        >
          <TrashIcon />
        </button>
        {showFullscreenToggle && (
          <button
            className="aw-header__btn"
            onClick={onToggleFullscreen}
            aria-label={panelState === 'fullscreen' ? copy.labels.minimize : copy.labels.expand}
            type="button"
          >
            {panelState === 'fullscreen' ? <MinimizeIcon /> : <ExpandIcon />}
          </button>
        )}
        <button
          className="aw-header__btn"
          onClick={onClose}
          aria-label={copy.labels.close}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function ChatbotMessage({ message }) {
  const className =
    message.role === 'assistant'
      ? 'aw-message aw-message--assistant'
      : 'aw-message aw-message--user';

  return (
    <div className={className}>
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
  );
}

function PromptList({ prompts = [], onQuickPrompt, disabled = false, inline = false }) {
  return (
    <div className={`aw-prompts${inline ? ' aw-prompts--inline' : ''}`}>
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
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
