import { useState, useEffect } from 'react';
import { trackConsent } from '../../hooks/useAnalytics';
import { STORAGE_KEY } from '../../constants';

function updateConsent(granted) {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === 'granted') {
      updateConsent(true);
      return;
    }

    if (stored === 'denied') {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  if (!visible) return null;

  function handleAccept(type) {
    localStorage.setItem(STORAGE_KEY, 'granted');
    updateConsent(true);
    trackConsent(type);
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    setVisible(false);
  }

  return (
    <>
      <div className="arg-cookie-backdrop" aria-hidden="true" />
      <div id="arg-cookie-banner" role="dialog" aria-label="Cookie consent">
        <p>
          We use analytics cookies to understand how visitors use our site and improve it. No
          personal data is sold or shared with third parties.
        </p>
        <div className="arg-cookie-actions">
          <button
            className="arg-cookie-btn arg-cookie-btn--secondary"
            onClick={() => handleAccept('essential')}
          >
            Accept Essential
          </button>
          <button
            className="arg-cookie-btn arg-cookie-btn--accept"
            onClick={() => handleAccept('all')}
          >
            Accept All
          </button>
        </div>
      </div>
    </>
  );
}
