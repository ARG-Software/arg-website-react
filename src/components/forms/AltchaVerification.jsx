import { useEffect, useRef } from 'react';
import 'altcha';
import { getSecurityChallengeEndpoint } from '@services/apiService';

const SECURITY_CHALLENGE_ENDPOINT = getSecurityChallengeEndpoint();

export function AltchaVerification({ onStateChange }) {
  const widgetRef = useRef(null);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return undefined;

    function handleStateChange(event) {
      onStateChange?.(event.detail?.state || 'unverified');
    }

    widget.addEventListener('statechange', handleStateChange);

    return () => {
      widget.removeEventListener('statechange', handleStateChange);
    };
  }, [onStateChange]);

  return (
    <altcha-widget
      ref={widgetRef}
      auto="off"
      challenge={SECURITY_CHALLENGE_ENDPOINT}
      name="altcha"
      type="checkbox"
      workers="2"
    ></altcha-widget>
  );
}
