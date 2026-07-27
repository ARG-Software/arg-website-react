import { useEffect, useRef } from 'react';
import 'altcha';

const CONTACT_CHALLENGE_ENDPOINT = '/.netlify/functions/contact-challenge';
const ALTCHA_CONFIGURATION = JSON.stringify({
  hideFooter: true,
});

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
    <div className="altcha-verification">
      <altcha-widget
        ref={widgetRef}
        auto="onload"
        challenge={CONTACT_CHALLENGE_ENDPOINT}
        configuration={ALTCHA_CONFIGURATION}
        name="altcha"
        type="checkbox"
        workers="2"
      ></altcha-widget>
    </div>
  );
}
