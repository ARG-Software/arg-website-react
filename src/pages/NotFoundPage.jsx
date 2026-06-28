import { Logo, SEO } from '../components';
import AppLink from '../components/navigation/AppLink';
import { useNotFoundPageScene } from '../hooks/useNotFoundPageScene';
import { useScrollAnimations, useTimeOnPage } from '../hooks';
import { trackCTA } from '../hooks/useAnalytics';
import { getProjectBookingLink } from '../services/externalLinks';

import '../styles/404.css';

export default function NotFoundPage() {
  useTimeOnPage('/404');
  useNotFoundPageScene();
  useScrollAnimations();

  return (
    <div
      className="notfound-page"
      data-animate-scope
      data-animate-default-trigger="load"
      data-animate-default-preset="fade-up"
      data-animate-default-stagger="120"
    >
      <SEO
        title="Page Not Found | Arg Software"
        description="The page you're looking for doesn't exist. Head back to Arg Software's homepage."
        path="/404"
        noIndex
      />

      <div className="canvas-container">
        <canvas id="notfound-canvas" />
      </div>

      <div className="top-ui" data-animate-order="0">
        <AppLink to="/" aria-label="Arg Software" className="site-logo-wrapper">
          <Logo className="site-logo" />
        </AppLink>
      </div>

      <div className="bottom-ui">
        <span className="error-num" data-animate-order="1">
          System Fragment 404
        </span>
        <p className="message" data-animate-order="2">
          The requested path got lost in town. But we are always here to help you.
        </p>
        <div className="cta-buttons" data-animate-order="3">
          <AppLink to="/" className="button-base">
            Return home
          </AppLink>
          <a
            href={getProjectBookingLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="button-base"
            onClick={() => trackCTA('book_meeting', '404_page')}
          >
            Book a call
          </a>
        </div>
      </div>
    </div>
  );
}
