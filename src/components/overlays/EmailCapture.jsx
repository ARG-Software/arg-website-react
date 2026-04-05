import { useState, useEffect } from 'react';
import { closeSvg } from '../icons/SocialIcons';
import { SESSION_KEY, ALREADY_SUBSCRIBED_KEY, BASIN_ENDPOINT } from '../../constants';

export function EmailCapture() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (localStorage.getItem(ALREADY_SUBSCRIBED_KEY)) return;

    let triggered = false;

    const show = () => {
      if (triggered) return;
      triggered = true;
      setVisible(true);
    };

    const target = document.getElementById('cases');

    if (!target) {
      // fallback if section isn't in the DOM yet
      const timer = setTimeout(show, 3000);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || status === 'loading') return;

    // Validate message if provided (minimum 3 words)
    if (message.trim() && message.trim().split(/\s+/).length < 3) {
      alert('Please provide at least 3 words for your message, or leave it blank.');
      return;
    }

    setStatus('loading');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('message', message);

    try {
      const response = await fetch(BASIN_ENDPOINT, {
        method: 'POST',
        body: formData,
        // If you need JSON response, Basin can return JSON (see Basin docs)
        headers: {
          Accept: 'application/json',
        },
      });

      await response.json(); // Basin returns JSON if you accept it

      if (response.ok) {
        setStatus('success');
        localStorage.setItem(ALREADY_SUBSCRIBED_KEY, '1');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
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
            <button className="ec-error-retry" onClick={() => setStatus('idle')}>
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
              we can help — no pitch, just a real look at your needs.
            </p>

            <form className="ec-form" onSubmit={handleSubmit}>
              <input
                className="ec-input"
                autoComplete="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                validate="^[^\s@]+@[^\s@]+\.[^\s@]+$"
              />
              <div className="ec-optional-wrap">
                <textarea
                  className="ec-input ec-input--optional"
                  name="message"
                  placeholder="Tell us about your project or request (optional)"
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  rows="3"
                />
                <span className="ec-optional-label">Optional</span>
              </div>
              <button className="ec-submit" type="submit" disabled={status === 'loading'}>
                <span className="ec-submit-inner">
                  <span className="ec-submit-text">
                    {status === 'loading' ? 'Sending…' : 'Send it over'}
                  </span>
                  <span className="ec-submit-text">
                    {status === 'loading' ? 'Sending…' : 'Get feedback'}
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
