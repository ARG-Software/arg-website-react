import { useCallback, useState } from 'react';

export function useAssistantConversation() {
  const [messages, setMessages] = useState([]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, setMessages, clearConversation };
}
