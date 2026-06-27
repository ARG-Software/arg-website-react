import { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { LoadingProvider } from './providers/LoadingProvider.jsx';
import { RAFProvider } from './providers/RAFProvider.jsx';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/home/HomePage.jsx';
import { LenisProvider } from './providers/LenisProvider.jsx';
import { TransitionProvider } from './providers/TransitionProvider.jsx';
import { CookieConsent } from './components/index.js';
import './styles/base.css';
import './styles/home.css';
import './styles/components.css';
import './styles/legal.css';
import './styles/effects.css';

const PartnersPage = lazy(() => import('./pages/PartnersPage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage.jsx'));
const CareersPage = lazy(() => import('./pages/CareersPage.jsx'));
const WorkingWithUsPage = lazy(() => import('./pages/WorkingWithUsPage.jsx'));
const BlogPage = lazy(() => import('./pages/blog/BlogPage.jsx'));
const BlogPostPage = lazy(() => import('./pages/blog/BlogPostPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function BlogPostPageWrapper() {
  const { slug } = useParams();
  return <BlogPostPage slug={slug} />;
}

function ProjectDetailPageWrapper() {
  const { slug } = useParams();
  return <ProjectDetailPage key={slug} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <LoadingProvider>
    <HelmetProvider>
      <BrowserRouter scrollRestoration="manual">
        <RAFProvider>
          <LenisProvider>
            <TransitionProvider>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/partners" element={<PartnersPage />} />
                  <Route path="/partners/" element={<PartnersPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/" element={<ProjectsPage />} />
                  <Route path="/projects/:slug" element={<ProjectDetailPageWrapper />} />
                  <Route path="/projects/:slug/" element={<ProjectDetailPageWrapper />} />
                  <Route path="/careers" element={<CareersPage />} />
                  <Route path="/careers/" element={<CareersPage />} />
                  <Route path="/working-with-us" element={<WorkingWithUsPage />} />
                  <Route path="/working-with-us/" element={<WorkingWithUsPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPageWrapper />} />
                  <Route path="/blog/:slug/" element={<BlogPostPageWrapper />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/privacy/" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/terms/" element={<TermsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </TransitionProvider>
          </LenisProvider>
        </RAFProvider>
        <CookieConsent />
      </BrowserRouter>
    </HelmetProvider>
  </LoadingProvider>
);
