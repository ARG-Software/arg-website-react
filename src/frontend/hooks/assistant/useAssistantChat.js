import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useActiveHomepageSection } from '@hooks/useActiveHomepageSection';
import { submitAssistantQuestion } from '@services/apiService';
import { trackAssistantEvent } from '@services/analytics';

const ERROR_MESSAGES = {
  question_required: 'Please enter a question.',
  question_too_long: 'Question must be 1000 characters or fewer.',
  configuration_error: 'Gaspar is temporarily unavailable. Please try again later.',
  embedding_quota_exceeded: 'Gaspar is temporarily unavailable. Please try again later.',
  answer_failed: 'Something went wrong. Please try again.',
  network_error: 'Unable to reach Gaspar. Please check your connection.',
  request_timeout: 'Gaspar is taking too long to respond. Please try again.',
  bot_verification_failed: 'Verification failed. Please try again.',
  rate_limited: 'You are sending messages too quickly. Please wait a moment.',
};

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.answer_failed;
}

export function useAssistantChat({ getPayload, consumePayload, preferredLanguage }) {
  const location = useLocation();
  const activeSection = useActiveHomepageSection(location.pathname);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  const submitQuestion = useCallback(
    async (question, chatHistory = []) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return null;

      setLoading(true);
      setError(null);
      setPendingStatus('Preparing secure chat...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      try {
        let altcha;

        try {
          altcha = await getPayload();
        } catch {
          setError(getErrorMessage('bot_verification_failed'));
          trackAssistantEvent('error', { error_code: 'bot_verification_failed' });
          return { success: false };
        }

        setPendingStatus('Searching ARG knowledge...');

        const response = await submitAssistantQuestion(
          {
            question: trimmed,
            messages: chatHistory,
            pageContext: {
              pathname: location.pathname,
              title: document.title,
              ...(activeSection ? { activeSection } : {}),
            },
            ...(preferredLanguage ? { preferredLanguage } : {}),
            altcha,
          },
          { signal: controller.signal }
        );

        setPendingStatus('Writing answer...');

        if (response.status === 403 || response.status === 429) {
          let code = response.status === 429 ? 'rate_limited' : 'bot_verification_failed';

          try {
            const errorData = await response.json();
            code = errorData.error?.code || code;
          } catch {
            // non-JSON 429 from Netlify native rate limit
          }

          if (code === 'bot_verification_failed') {
            consumePayload();
          }

          setError(getErrorMessage(code));
          trackAssistantEvent('error', { error_code: code });
          return { success: false };
        }

        const data = await response.json();

        if (!response.ok) {
          const code = data.error?.code || 'answer_failed';
          setError(getErrorMessage(code));
          trackAssistantEvent('error', { error_code: code });
          return { success: false };
        }

        const message = {
          role: 'assistant',
          content: data.answer,
          language: data.language,
          languagePreference: data.languagePreference,
          citations: data.citations || [],
          articleRecommendations: data.articleRecommendations || [],
          actions: data.actions || [],
        };

        trackAssistantEvent('answer', {
          has_citations: (data.citations || []).length > 0,
          citation_count: (data.citations || []).length,
          action_count: (data.actions || []).length,
        });

        return { success: true, message };
      } catch (error) {
        const code = error.name === 'AbortError' ? 'request_timeout' : 'network_error';
        setError(getErrorMessage(code));
        trackAssistantEvent('error', { error_code: code });
        return { success: false };
      } finally {
        clearTimeout(timeout);
        setLoading(false);
        setPendingStatus(null);
      }
    },
    [activeSection, consumePayload, getPayload, loading, location.pathname, preferredLanguage]
  );

  const resetChat = useCallback(() => {
    setError(null);
    setPendingStatus(null);
  }, []);

  return {
    loading,
    error,
    pendingStatus,
    setError,
    submitQuestion,
    resetChat,
  };
}
