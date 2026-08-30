import { Chatbot } from '@ui/widgets/Chatbot.jsx';
import assistantContent from '@data/assistant.json';
import { ChatbotLink } from '@components/navigation/ChatbotLink';
import { useAssistantWidgetController } from '@hooks/assistant/useAssistantWidgetController';
import { getAssistantActionDetails } from '@services/assistantActionsService';
import { trackAssistantEvent } from '@services/analytics';
import {
  getAssistantLinks,
  getInternalAssistantPath,
  trackAssistantLinkClick,
} from '@hooks/assistant/utils/assistantLinks';

export function AssistantWidget(props) {
  const controller = useAssistantWidgetController(props);
  const [leadAcceptPrompt, leadChatPrompt] = controller.assistantCopy.leadCaptureQuickPrompts;

  return (
    <Chatbot
      triggerImageSrc={assistantContent.imageSrc}
      triggerHidden={controller.isOpen}
      panelState={controller.panelState}
      isOpen={controller.isOpen}
      language={controller.activeLanguage}
      direction={controller.assistantDirection}
      copy={controller.assistantCopy}
      assistant={assistantContent}
      inputValue={controller.inputValue}
      inputPlaceholder={controller.inputPlaceholder}
      inputDisabled={controller.isInputDisabled}
      submitDisabled={controller.isSubmitDisabled}
      clearDisabled={controller.isClearDisabled}
      showFullscreenToggle={!controller.mobileViewport}
      loading={controller.loading}
      error={!controller.isLeadActive ? controller.error : null}
      pendingStatus={controller.pendingStatus}
      messages={buildChatbotMessages(controller)}
      welcomePrompts={buildWelcomePrompts(controller)}
      leadPrompts={buildLeadPrompts(controller, leadAcceptPrompt, leadChatPrompt)}
      messagesEndRef={controller.messagesEndRef}
      inputRef={controller.inputRef}
      onOpen={() => controller.open('trigger_button')}
      onClose={() => controller.close('close_button')}
      onClear={controller.handleClearConversation}
      onToggleFullscreen={controller.toggleFullscreen}
      onInputChange={controller.setInputValue}
      onSubmit={controller.handleSubmit}
      onQuickPrompt={controller.handleQuickPrompt}
    />
  );
}

function buildWelcomePrompts({ assistantCopy, isLeadActive, loading, handleQuickPrompt }) {
  if (isLeadActive) return [];

  return assistantCopy.quickPrompts.map(prompt => ({
    label: prompt,
    disabled: loading,
    onClick: () => handleQuickPrompt(prompt),
  }));
}

function buildLeadPrompts(controller, leadAcceptPrompt, leadChatPrompt) {
  if (!controller.showLeadPrompts) return null;

  const prompts = [];
  if (leadAcceptPrompt) {
    prompts.push({
      label: leadAcceptPrompt,
      onClick: () => controller.handleQuickPrompt(leadAcceptPrompt),
    });
  }

  prompts.push({
    label: controller.assistantCopy.labels.dontShowAgain,
    muted: true,
    onClick: controller.handleLeadDismissForTwoDays,
  });

  if (leadChatPrompt) {
    prompts.push({
      label: leadChatPrompt,
      onClick: () => controller.handleQuickPrompt(leadChatPrompt),
    });
  }

  return { prompts };
}

function buildChatbotMessages(controller) {
  const latestLeadAssistantIndex = getLatestLeadAssistantMessageIndex(controller.messages);
  const messages = controller.messages.map((message, index) =>
    buildChatbotMessage(message, controller, index === latestLeadAssistantIndex)
  );

  if (controller.leadStep === controller.LEAD_STEPS.ERROR) {
    messages.push({
      role: 'assistant',
      content: controller.leadError,
      actions: [
        buildButtonAction(controller.assistantCopy.labels.tryAgain, controller.retrySubmit),
        buildButtonAction(controller.assistantCopy.labels.cancel, controller.handleLeadCancel),
      ],
    });
  }

  return messages;
}

function getLatestLeadAssistantMessageIndex(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant' && message.source === 'lead_capture' && !message.isLoading) {
      return index;
    }
  }

  return -1;
}

function buildChatbotMessage(message, controller, isLatestLeadAssistantMessage = false) {
  const isLeadMessage = message.source === 'lead_capture';

  return {
    role: message.role,
    source: message.source,
    content: message.content,
    preserveWhitespace: isLeadMessage,
    linksLabel: controller.assistantCopy.labels.relatedLinks,
    links: message.role === 'assistant' && !isLeadMessage ? buildLinkNodes(message) : [],
    actions:
      message.role === 'assistant'
        ? buildActionNodes(message, controller, isLatestLeadAssistantMessage)
        : [],
    pendingMessage:
      message.isLoading && controller.leadStep === controller.LEAD_STEPS.SUBMITTING
        ? controller.assistantCopy.messages.sending
        : null,
  };
}

function buildLinkNodes(message) {
  return getAssistantLinks(message).map(link => ({
    node: renderAssistantLink(link),
  }));
}

function renderAssistantLink(link) {
  const internalPath = getInternalAssistantPath(link.url);
  const onClick = () => trackAssistantLinkClick(link);

  if (internalPath) {
    return (
      <ChatbotLink
        key={`${link.url}-${link.title}`}
        className="aw-source-link"
        href={internalPath}
        onClick={onClick}
      >
        {link.title}
      </ChatbotLink>
    );
  }

  if (link.url) {
    return (
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
    );
  }

  return (
    <span key={link.title} className="aw-source-link aw-source-link--static">
      {link.title}
    </span>
  );
}

function buildActionNodes(message, controller, isLatestLeadAssistantMessage = false) {
  if (message.source === 'lead_capture') {
    return buildLeadActionNodes(message, controller, isLatestLeadAssistantMessage);
  }

  const visibleActions = message.actions?.filter(action => !action.autoStart) || [];

  return visibleActions
    .map((action, index) => {
      const details = getAssistantActionDetails(
        action.type,
        message.assistantCopy || controller.assistantCopy
      );
      if (!details) return null;

      return {
        node: renderAssistantAction(details, action.type, index),
      };
    })
    .filter(Boolean);
}

function buildLeadActionNodes(message, controller, isLatestLeadAssistantMessage) {
  if (!controller.isLeadActive || !isLatestLeadAssistantMessage) return [];

  if (message.showConfirmButtons) {
    return [
      buildButtonAction(controller.assistantCopy.labels.send, controller.handleLeadConfirm, {
        disabled: controller.leadStep === controller.LEAD_STEPS.SUBMITTING,
      }),
      buildButtonAction(controller.assistantCopy.labels.edit, controller.handleLeadEdit, {
        disabled: controller.leadStep === controller.LEAD_STEPS.SUBMITTING,
      }),
      buildButtonAction(controller.assistantCopy.labels.cancel, controller.handleLeadCancel, {
        disabled: controller.leadStep === controller.LEAD_STEPS.SUBMITTING,
      }),
    ];
  }

  if (controller.leadStep === controller.LEAD_STEPS.SUBMITTING) return [];

  return [buildButtonAction(controller.assistantCopy.labels.cancel, controller.handleLeadCancel)];
}

function renderAssistantAction(details, actionType, index) {
  const trackClick = () => trackAssistantEvent('action_click', { action_type: actionType });
  const internalPath = getInternalAssistantPath(details.href);

  if (details.onClick) {
    return (
      <button
        key={`${actionType}-${index}`}
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

  if (internalPath) {
    return (
      <ChatbotLink
        key={`${actionType}-${index}`}
        className="aw-action"
        href={internalPath}
        onClick={trackClick}
      >
        {details.label}
      </ChatbotLink>
    );
  }

  return (
    <a
      key={`${actionType}-${index}`}
      className="aw-action"
      href={details.href}
      {...(details.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={trackClick}
    >
      {details.label}
    </a>
  );
}

function buildButtonAction(label, onClick, options = {}) {
  return {
    node: (
      <button className="aw-action" onClick={onClick} type="button" disabled={options.disabled}>
        {label}
      </button>
    ),
  };
}
