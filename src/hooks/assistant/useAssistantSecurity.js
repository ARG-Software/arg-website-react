import { useCallback, useEffect, useRef } from 'react';
import {
  consumeAltchaPayload,
  getAltchaPayload,
  prepareAltchaPayload,
} from '@services/altchaService';

export function useAssistantSecurity({ isOpen }) {
  const preparedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || preparedRef.current) return;

    preparedRef.current = true;
    prepareAltchaPayload().catch(() => {});
  }, [isOpen]);

  const getPayload = useCallback(async () => {
    return getAltchaPayload();
  }, []);

  const consumePayload = useCallback(() => {
    consumeAltchaPayload();
  }, []);

  return { getPayload, consumePayload };
}
