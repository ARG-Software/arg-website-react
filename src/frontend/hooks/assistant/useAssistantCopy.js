import { useCallback, useEffect, useRef, useState } from 'react';
import assistantContent from '@data/assistant.json';
import { fetchAssistantUiCopy } from '@services/apiService';
import {
  DEFAULT_ASSISTANT_LANGUAGE,
  getAssistantTextDirection,
  getBrowserAssistantLanguage,
  mergeAssistantCopy,
  normalizeAssistantLanguage,
  readCachedAssistantCopy,
  writeCachedAssistantCopy,
} from './utils/assistantCopy';

export function useAssistantCopy() {
  const [activeLanguage, setActiveLanguageState] = useState(getBrowserAssistantLanguage);
  const [assistantCopy, setAssistantCopy] = useState(() => {
    const browserLanguage = getBrowserAssistantLanguage();
    return readCachedAssistantCopy(browserLanguage) || assistantContent;
  });
  const latestRequestRef = useRef(0);

  const loadAssistantCopy = useCallback(async language => {
    const normalizedLanguage = normalizeAssistantLanguage(language);

    setActiveLanguageState(normalizedLanguage);

    if (normalizedLanguage === DEFAULT_ASSISTANT_LANGUAGE) {
      setAssistantCopy(assistantContent);
      return assistantContent;
    }

    const cached = readCachedAssistantCopy(normalizedLanguage);
    if (cached) {
      setAssistantCopy(cached);
      return cached;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    try {
      const response = await fetchAssistantUiCopy(normalizedLanguage);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error?.message || 'Unable to load assistant copy');

      const copy = mergeAssistantCopy(data.copy);
      writeCachedAssistantCopy(data.language || normalizedLanguage, data.copy);

      if (latestRequestRef.current === requestId) {
        setAssistantCopy(copy);
      }

      return copy;
    } catch {
      setAssistantCopy(assistantContent);
      return assistantContent;
    }
  }, []);

  const setActiveLanguage = useCallback(
    language => {
      const normalizedLanguage = normalizeAssistantLanguage(language);
      if (normalizedLanguage === activeLanguage) return Promise.resolve(assistantCopy);
      return loadAssistantCopy(normalizedLanguage);
    },
    [activeLanguage, assistantCopy, loadAssistantCopy]
  );

  useEffect(() => {
    loadAssistantCopy(activeLanguage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    activeLanguage,
    assistantCopy,
    assistantDirection: getAssistantTextDirection(activeLanguage),
    setActiveLanguage,
  };
}
