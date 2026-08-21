import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useActiveHomepageSection } from '@hooks/useActiveHomepageSection';
import { submitAssistantConversationLog } from '@services/apiService';

const CONVERSATION_ID_STORAGE_KEY = 'arg.assistant.conversationId';
const IDLE_SAVE_MS = 8000;

export function useAssistantConversationLogger({ messages, isOpen, language }) {
  const location = useLocation();
  const activeSection = useActiveHomepageSection(location.pathname);
  const [conversationId, setConversationId] = useState(createStoredConversationId);
  const saveTimerRef = useRef(null);
  const latestPayloadRef = useRef(null);
  const dirtyRef = useRef(false);
  const lastSavedSignatureRef = useRef('');
  const wasOpenRef = useRef(isOpen);

  const flushConversation = useCallback(async ({ keepalive = false } = {}) => {
    const payload = latestPayloadRef.current;

    if (!dirtyRef.current || !payload || payload.messages.length === 0) return;

    const signature = createPayloadSignature(payload);
    if (signature === lastSavedSignatureRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      const response = await submitAssistantConversationLog(payload, { keepalive });

      if (response.ok) {
        lastSavedSignatureRef.current = signature;
        dirtyRef.current = false;
      }
    } catch {
      if (keepalive) {
        lastSavedSignatureRef.current = signature;
      }
    }
  }, []);

  useEffect(() => {
    const loggableMessages = createLoggableMessages(messages);

    if (loggableMessages.length === 0) {
      latestPayloadRef.current = null;
      dirtyRef.current = false;
      return undefined;
    }

    latestPayloadRef.current = {
      conversationId,
      messages: loggableMessages,
      pageContext: {
        pathname: location.pathname,
        title: typeof document === 'undefined' ? '' : document.title,
        ...(activeSection ? { activeSection } : {}),
      },
      language,
    };
    dirtyRef.current = true;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      flushConversation();
    }, IDLE_SAVE_MS);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [activeSection, conversationId, flushConversation, language, location.pathname, messages]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      flushConversation({ keepalive: true });
    }

    wasOpenRef.current = isOpen;
  }, [flushConversation, isOpen]);

  useEffect(() => {
    function flushOnHidden() {
      if (document.visibilityState === 'hidden') {
        flushConversation({ keepalive: true });
      }
    }

    function flushOnPageHide() {
      flushConversation({ keepalive: true });
    }

    document.addEventListener('visibilitychange', flushOnHidden);
    window.addEventListener('pagehide', flushOnPageHide);

    return () => {
      document.removeEventListener('visibilitychange', flushOnHidden);
      window.removeEventListener('pagehide', flushOnPageHide);
    };
  }, [flushConversation]);

  const resetConversationLog = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const nextConversationId = createConversationId();
    storeConversationId(nextConversationId);
    setConversationId(nextConversationId);
    latestPayloadRef.current = null;
    dirtyRef.current = false;
    lastSavedSignatureRef.current = '';
  }, []);

  return {
    conversationId,
    flushConversation,
    resetConversationLog,
  };
}

function createLoggableMessages(messages) {
  return messages
    .filter(message => message?.role && message?.content && !message.isLoading)
    .map(message => ({
      role: message.role,
      content: String(message.content),
      ...(message.source ? { source: message.source } : {}),
      ...(message.language ? { language: message.language } : {}),
      createdAt: message.createdAt || new Date().toISOString(),
      ...(message.citations?.length ? { citations: simplifyReferences(message.citations) } : {}),
      ...(message.articleRecommendations?.length
        ? { articleRecommendations: simplifyReferences(message.articleRecommendations) }
        : {}),
      ...(message.actions?.length ? { actions: simplifyActions(message.actions) } : {}),
    }));
}

function simplifyReferences(items) {
  return items.map(item => ({ title: item.title || '', url: item.url || '' }));
}

function simplifyActions(actions) {
  return actions.map(action => ({ type: action.type || '' }));
}

function createPayloadSignature(payload) {
  const lastMessage = payload.messages[payload.messages.length - 1];

  return [
    payload.conversationId,
    payload.messages.length,
    lastMessage?.role || '',
    lastMessage?.content || '',
    payload.pageContext?.pathname || '',
    payload.language || '',
  ].join('|');
}

function createStoredConversationId() {
  if (typeof window === 'undefined') return createConversationId();

  const stored = window.sessionStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
  if (stored) return stored;

  const conversationId = createConversationId();
  storeConversationId(conversationId);

  return conversationId;
}

function storeConversationId(conversationId) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(CONVERSATION_ID_STORAGE_KEY, conversationId);
}

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
