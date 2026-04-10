import { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/home/HomePage.jsx';
import { LenisProvider } from './providers/LenisProvider.jsx';
import { TransitionProvider } from './providers/TransitionProvider.jsx';
import { CookieConsent } from './components/index.js';
import './styles/base.css';

const PartnersPage = lazy(() => import('./pages/PartnersPage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const BlogPage = lazy(() => import('./pages/blog/BlogPage.jsx'));
const BlogPostPage = lazy(() => import('./pages/blog/BlogPostPage.jsx'));
// const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
function BlogPostPageWrapper() {
  const { slug } = useParams();
  return <BlogPostPage slug={slug} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter scrollRestoration="manual">
      <LenisProvider>
        <TransitionProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/partners/" element={<PartnersPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/" element={<ProjectsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPageWrapper />} />
              <Route path="/blog/:slug/" element={<BlogPostPageWrapper />} />
              {/* <Route path="/team" element={<TeamPage />} />
              <Route path="/team/" element={<TeamPage />} /> */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </TransitionProvider>
      </LenisProvider>
      <CookieConsent />
    </BrowserRouter>
  </HelmetProvider>
);
