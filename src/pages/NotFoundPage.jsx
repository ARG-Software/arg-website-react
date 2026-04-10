import { Logo, SEO } from '../components';
import AppLink from '../components/links/AppLink';
import { useNotFoundPageScene } from '../hooks/useNotFoundPageScene';
import { trackCTA } from '../hooks/useAnalytics';
import '../styles/404.css';

export default function NotFoundPage() {
  useNotFoundPageScene();

  return (
    <div className="notfound-page">
      <SEO
        title="Page Not Found | ARG Software"
        description="The page you're looking for doesn't exist. Head back to ARG Software's homepage."
        path="/404"
        noIndex
      />

      <div className="canvas-container">
        <canvas id="notfound-canvas" />
      </div>

      <div className="top-ui">
        <AppLink to="/" aria-label="Arg Software" className="site-logo-wrapper">
          <Logo className="site-logo" />
        </AppLink>
      </div>

      <div className="bottom-ui">
        <span className="error-num">System Fragment 404</span>
        <p className="message">
          The requested path got lost in town. But we are always here to help you.
        </p>
        <div className="cta-buttons">
          <AppLink to="/" className="button-base">
            Return home
          </AppLink>
          <a
            href="https://zcal.co/argsoftware/project"
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
