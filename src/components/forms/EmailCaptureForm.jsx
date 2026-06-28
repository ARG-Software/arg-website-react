import { useState, useEffect } from 'react';
import { closeSvg } from '../icons/SocialIcons';
import { trackEvent } from '../../hooks/useAnalytics';
import { ALREADY_SUBSCRIBED_KEY, NEVER_SHOW_LEAD_CAPTURE_KEY, SESSION_KEY } from '../../constants';
import { useWeb3Form } from '../../hooks';

const LEAD_CAPTURE_DELAY_MS = 15000;

export function EmailCaptureForm() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const { status, isSubmitting, submitForm, resetStatus } = useWeb3Form({
    subject: 'New ARG lead capture',
    source: 'lead_capture_widget',
    formName: 'lead_capture',
    resetOnSuccess: false,
    successMessage: 'Lead received.',
    onSubmit: () => trackEvent('lead_capture', { action: 'submit' }),
    onSuccess: () => {
      trackEvent('lead_capture', { action: 'success' });
      localStorage.setItem(ALREADY_SUBSCRIBED_KEY, '1');
    },
    onError: () => trackEvent('lead_capture', { action: 'error' }),
  });

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (localStorage.getItem(ALREADY_SUBSCRIBED_KEY)) return;
    if (localStorage.getItem(NEVER_SHOW_LEAD_CAPTURE_KEY)) return;
    if (window.location.pathname.replace(/\/+$/, '') === '/contact') return;

    let triggered = false;
    let timerElapsed = false;
    let isContactSectionVisible = false;

    const show = () => {
      if (triggered) return;
      if (isContactSectionVisible) return;
      triggered = true;
      trackEvent('lead_capture', { action: 'impression' });
      setVisible(true);
    };

    const timer = setTimeout(() => {
      timerElapsed = true;
      show();
    }, LEAD_CAPTURE_DELAY_MS);

    const target = document.getElementById('contact');

    if (!target) {
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      entries => {
        isContactSectionVisible = entries.some(entry => entry.isIntersecting);

        if (timerElapsed && !isContactSectionVisible) {
          show();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(target);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  function dismiss() {
    if (neverShowAgain) {
      localStorage.setItem(NEVER_SHOW_LEAD_CAPTURE_KEY, '1');
      trackEvent('lead_capture', { action: 'never_show_again' });
    } else {
      trackEvent('lead_capture', { action: 'dismiss' });
    }

    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || isSubmitting) return;

    if (message.trim() && message.trim().split(/\s+/).length < 3) {
      alert('Please provide at least 3 words for your message, or leave it blank.');
      return;
    }

    await submitForm(event.currentTarget);
  }

  return (
    <div
      className={`ec-card${visible ? ' ec-card--visible' : ''}`}
      role="dialog"
      aria-label="Get a free assessment from ARG"
      aria-hidden={!visible}
    >
      <div className="ec-inner">
        {status === 'success' ? (
          <div className="ec-success">
            <button className="ec-close" onClick={dismiss} aria-label="Dismiss">
              <span className="ec-close-icon">{closeSvg}</span>
            </button>
            <div className="ec-success-check">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="10.5" stroke="url(#ec-g)" />
                <path
                  d="M6.5 11L9.5 14L15.5 8"
                  stroke="url(#ec-g)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient
                    id="ec-g"
                    x1="0"
                    y1="0"
                    x2="22"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#F0060D" />
                    <stop offset=".49" stopColor="#C924D7" />
                    <stop offset="1" stopColor="#7904FD" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="ec-success-title">On it.</p>
            <p className="ec-success-body">Expect our honest take within 48 hours.</p>
          </div>
        ) : status === 'error' ? (
          <div className="ec-error">
            <p className="ec-error-message">Something went wrong. Please try again.</p>
            <button className="ec-error-retry" onClick={resetStatus}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <button className="ec-close" onClick={dismiss} aria-label="Dismiss">
              <span className="ec-close-icon">{closeSvg}</span>
            </button>

            <div className="ec-eyebrow">Free assessment</div>

            <h3 className="ec-heading">
              Tell us what
              <br />
              you're building.
            </h3>

            <p className="ec-body">
              Drop your email (and optionally a message) and we'll reply with honest feedback on how
              we can help - no pitch, just a real look at your needs.
            </p>

            <form className="ec-form" onSubmit={handleSubmit}>
              <div className="ec-field">
                <label className="ec-label" htmlFor="lead-capture-email">
                  Email
                </label>
                <input
                  id="lead-capture-email"
                  className="ec-input"
                  autoComplete="email"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                />
              </div>
              <div className="ec-field">
                <label className="ec-label" htmlFor="lead-capture-message">
                  Project context
                </label>
                <div className="ec-optional-wrap">
                  <textarea
                    id="lead-capture-message"
                    className="ec-input ec-input--optional"
                    name="message"
                    placeholder="Tell us about your project or request"
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                    rows="3"
                  />
                  <span className="ec-optional-label">Optional</span>
                </div>
              </div>
              <label className="ec-never-show">
                <input
                  type="checkbox"
                  checked={neverShowAgain}
                  onChange={event => setNeverShowAgain(event.target.checked)}
                />
                <span>Do not show this again</span>
              </label>
              <button className="ec-submit" type="submit" disabled={isSubmitting}>
                <span className="ec-submit-inner">
                  <span className="ec-submit-text">
                    {isSubmitting ? 'Sending...' : 'Send it over'}
                  </span>
                  <span className="ec-submit-text">
                    {isSubmitting ? 'Sending...' : 'Get feedback'}
                  </span>
                </span>
              </button>
            </form>

            <p className="ec-disclaimer">We reply within 48h. No spam, ever.</p>
          </>
        )}
      </div>
    </div>
  );
}
