import { Logo, SEO } from '../components';
import AppLink from '../components/links/AppLink';
import '../styles/404.css';

export default function NotFoundPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="notfound-page">
      <SEO
        title="Page Not Found | ARG Software"
        description="The page you're looking for doesn't exist. Head back to ARG Software's homepage."
        path="/404"
        noIndex
      />

      <main className="main">
        <div className="ghost" aria-hidden="true">
          404
        </div>

        <div className="content">
          <AppLink to="/" className="logo t-link" aria-label="ARG Software — home">
            <Logo />
          </AppLink>

          <span className="tag">Error 404</span>
          <div className="code" aria-hidden="true">
            404
          </div>
          <h1 className="heading">Page not found</h1>
          <p className="sub">
            The page you're looking for has moved, been deleted, or never existed. Let's get you
            back on track.
          </p>

          <div className="actions">
            <AppLink to="/" className="btn-primary t-link">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Go to homepage
            </AppLink>

            <a
              href="https://zcal.co/argsoftware/project"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Book a meeting
            </a>
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>© {currentYear} ARG Software</span>
        <ul className="footer-links" aria-label="Footer links">
          <li>
            <AppLink to="/">Home</AppLink>
          </li>
          <li>
            <AppLink to="/blog">Blog</AppLink>
          </li>
          <li>
            <AppLink to="/projects">Projects</AppLink>
          </li>
          <li>
            <AppLink to="/partners">Partners</AppLink>
          </li>
          <li>
            <a href="mailto:hello@arg.software">Contact</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}
