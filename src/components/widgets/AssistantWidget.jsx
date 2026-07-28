import assistantContent from '@data/assistant.json';
import AppLink from '@components/navigation/AppLink';
import { useAssistantWidgetController } from '@hooks/assistant/useAssistantWidgetController';
import { getAssistantActionDetails } from '@services/assistantActionsService';
import { trackAssistantEvent } from '@utils/analytics';
import {
  getAssistantLinks,
  getInternalAssistantPath,
  trackAssistantLinkClick,
} from '@utils/assistantLinks';

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

function AssistantLinkList({ links }) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="aw-source-links" aria-label={assistantContent.labels.relatedLinks}>
      {links.map(link => {
        const internalPath = getInternalAssistantPath(link.url);
        const onClick = () => trackAssistantLinkClick(link);

        return internalPath ? (
          <AppLink
            key={`${link.url}-${link.title}`}
            className="aw-source-link"
            to={internalPath}
            onClick={onClick}
          >
            {link.title}
          </AppLink>
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

function AssistantActions({ actions }) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="aw-actions">
      {actions.map((action, index) => {
        const details = getAssistantActionDetails(action.type);

        if (!details) return null;

        const trackClick = () => trackAssistantEvent('action_click', { action_type: action.type });

        if (details.onClick) {
          return (
            <button
              key={`${action.type}-${index}`}
              className="aw-action"
              type="button"
              onClick={() => {
                trackClick();
                details.onClick();
              }}
            >
              {details.label}
            </button>
          );
        }

        return (
          <a
            key={`${action.type}-${index}`}
            className="aw-action"
            href={details.href}
            {...(details.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={trackClick}
          >
            {details.label}
          </a>
        );
      })}
    </div>
  );
}

function AssistantChatMessage({ message }) {
  const isAssistantMessage = message.role === 'assistant';
  const className = isAssistantMessage
    ? 'aw-message aw-message--assistant'
    : 'aw-message aw-message--user';

  return (
    <div className={className}>
      <p>{message.content}</p>
      {isAssistantMessage && <AssistantLinkList links={getAssistantLinks(message)} />}
      {isAssistantMessage && <AssistantActions actions={message.actions} />}
    </div>
  );
}

export function AssistantWidget(props) {
  const {
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
  } = useAssistantWidgetController(props);
  const [leadAcceptPrompt, leadChatPrompt] = assistantContent.leadCaptureQuickPrompts;

  return (
    <>
      <button
        className={`aw-trigger${isOpen ? ' aw-trigger--hidden' : ''}`}
        onClick={() => open('trigger_button')}
        aria-label={assistantContent.labels.open}
        type="button"
      >
        <span className="aw-trigger__icon">
          <img src={assistantContent.imageSrc} alt="" />
        </span>
      </button>

      <div
        className={`aw-panel${panelState === 'open' ? ' aw-panel--open' : ''}${panelState === 'fullscreen' ? ' aw-panel--open aw-panel--fullscreen' : ''}`}
        role="dialog"
        aria-label={assistantContent.labels.dialog}
        aria-hidden={!isOpen}
        data-lenis-prevent
      >
        <div className="aw-header">
          <div className="aw-header__left">
            <div className="aw-header__avatar">
              <img src={assistantContent.imageSrc} alt="" />
            </div>
            <div>
              <div className="aw-header__title">{assistantContent.name}</div>
              <div className="aw-header__status">
                <span className="aw-header__dot" />
                {assistantContent.statusText}
              </div>
            </div>
          </div>
          <div className="aw-header__controls">
            <button
              className="aw-header__btn"
              onClick={handleClearConversation}
              aria-label={assistantContent.labels.clear}
              type="button"
              disabled={isClearDisabled}
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
            {!mobileViewport && panelState !== 'fullscreen' && (
              <button
                className="aw-header__btn"
                onClick={toggleFullscreen}
                aria-label={assistantContent.labels.expand}
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
            {!mobileViewport && panelState === 'fullscreen' && (
              <button
                className="aw-header__btn"
                onClick={toggleFullscreen}
                aria-label={assistantContent.labels.minimize}
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
              aria-label={assistantContent.labels.close}
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
            <p>{assistantContent.messages.welcome}</p>
            {!isLeadActive && (
              <div className="aw-prompts aw-prompts--inline">
                {assistantContent.quickPrompts.map(prompt => (
                  <button
                    key={prompt}
                    className="aw-prompt"
                    onClick={() => handleQuickPrompt(prompt)}
                    type="button"
                    disabled={loading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {leadMessages.map((msg, index) => (
            <div key={`lead-${index}`} className={`aw-message aw-message--${msg.role}`}>
              <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
              {msg.showConfirmButtons && isLeadActive && (
                <div className="aw-actions">
                  <button
                    className="aw-action"
                    onClick={handleLeadConfirm}
                    type="button"
                    disabled={leadStep === LEAD_STEPS.SUBMITTING}
                  >
                    {assistantContent.labels.send}
                  </button>
                  <button
                    className="aw-action"
                    onClick={handleLeadEdit}
                    type="button"
                    disabled={leadStep === LEAD_STEPS.SUBMITTING}
                  >
                    {assistantContent.labels.edit}
                  </button>
                  <button
                    className="aw-action"
                    onClick={handleLeadCancel}
                    type="button"
                    disabled={leadStep === LEAD_STEPS.SUBMITTING}
                  >
                    {assistantContent.labels.cancel}
                  </button>
                </div>
              )}
              {msg.isLoading && leadStep === LEAD_STEPS.SUBMITTING && (
                <PendingStatus message={assistantContent.messages.sending} />
              )}
            </div>
          ))}

          {leadStep === LEAD_STEPS.ERROR && (
            <div className="aw-message aw-message--assistant">
              <p>{leadError}</p>
              <div className="aw-actions">
                <button className="aw-action" onClick={retrySubmit} type="button">
                  {assistantContent.labels.tryAgain}
                </button>
                <button className="aw-action" onClick={handleLeadCancel} type="button">
                  {assistantContent.labels.cancel}
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <AssistantChatMessage key={`chat-${index}`} message={msg} />
          ))}

          {loading && <PendingStatus message={pendingStatus} />}

          <div ref={messagesEndRef} />
        </div>

        {showLeadPrompts && (
          <div className="aw-prompts">
            {leadAcceptPrompt && (
              <button
                className="aw-prompt"
                onClick={() => handleQuickPrompt(leadAcceptPrompt)}
                type="button"
              >
                {leadAcceptPrompt}
              </button>
            )}
            <button
              className="aw-prompt aw-prompt--muted"
              onClick={handleLeadDismissForTwoDays}
              type="button"
            >
              {assistantContent.labels.dontShowAgain}
            </button>
            {leadChatPrompt && (
              <button
                className="aw-prompt"
                onClick={() => handleQuickPrompt(leadChatPrompt)}
                type="button"
              >
                {leadChatPrompt}
              </button>
            )}
          </div>
        )}

        {error && !isLeadActive && <div className="aw-error">{error}</div>}

        <form className="aw-input-area" onSubmit={handleSubmit}>
          <div className="aw-input-wrap">
            <input
              ref={inputRef}
              className="aw-input"
              type="text"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={isInputDisabled}
            />
            <button
              className="aw-send"
              type="submit"
              disabled={isSubmitDisabled}
              aria-label={
                isLeadActive
                  ? assistantContent.labels.sendResponse
                  : assistantContent.labels.sendQuestion
              }
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
