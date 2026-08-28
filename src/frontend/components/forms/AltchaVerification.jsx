import { useEffect, useRef } from 'react';
import 'altcha';
import 'altcha/themes/business.css';
import { getSecurityChallengeEndpoint } from '@services/apiService';

const SECURITY_CHALLENGE_ENDPOINT = getSecurityChallengeEndpoint();

export function AltchaVerification({
  challengeEndpoint = SECURITY_CHALLENGE_ENDPOINT,
  onStateChange,
  onVerified,
  theme,
}) {
  const widgetRef = useRef(null);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return undefined;

    function handleStateChange(event) {
      const state = event.detail?.state || 'unverified';
      onStateChange?.(state);

      if (state === 'verified' && event.detail?.payload) {
        onVerified?.(event.detail.payload);
      }
    }

    widget.addEventListener('statechange', handleStateChange);

    return () => {
      widget.removeEventListener('statechange', handleStateChange);
    };
  }, [onStateChange, onVerified]);

  return (
    <altcha-widget
      ref={widgetRef}
      auto="off"
      challenge={challengeEndpoint}
      name="altcha"
      theme={theme}
      type="checkbox"
      workers="2"
    ></altcha-widget>
  );
}
