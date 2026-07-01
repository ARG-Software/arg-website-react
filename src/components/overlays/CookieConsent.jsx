import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { trackConsent } from '../../utils/analytics';
import { STORAGE_KEY } from '../../constants';
import { LoadingContext } from '../../providers/LoadingProvider';

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
  const location = useLocation();
  const loadingDone = useContext(LoadingContext);
  const isHomepage = location.pathname === '/';

  useEffect(() => {
    if (!isHomepage) {
      setVisible(false);
      return;
    }

    if (!loadingDone) return;

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
  }, [isHomepage, loadingDone]);

  if (!visible) return null;

  function handleAccept(type) {
    localStorage.setItem(STORAGE_KEY, 'granted');
    updateConsent(true);
    trackConsent(type);
    setVisible(false);
  }

  return (
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
  );
}

