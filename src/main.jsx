import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { LoadingProvider } from './providers/LoadingProvider.jsx';
import { RAFProvider } from './providers/RAFProvider.jsx';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/home/HomePage.jsx';
import { LenisProvider } from './providers/LenisProvider.jsx';
import { TransitionProvider } from './providers/TransitionProvider.jsx';
import { CookieConsent } from '@components/overlays/CookieConsent';
import { EmailCaptureForm } from '@components/forms/EmailCaptureForm';
import { ErrorBoundary } from '@components/layout/ErrorBoundary';
import { lazyWithRetry } from '@utils/lazyWithRetry';
import './styles/base.css';
import './styles/home.css';
import './styles/components.css';
import './styles/legal.css';
import './styles/effects.css';

const PartnersPage = lazyWithRetry(() => import('./pages/PartnersPage.jsx'));
const ProjectsPage = lazyWithRetry(() => import('./pages/ProjectsPage.jsx'));
const ProjectDetailPage = lazyWithRetry(() => import('./pages/ProjectDetailPage.jsx'));
const CareersPage = lazyWithRetry(() => import('./pages/CareersPage.jsx'));
const WorkingWithUsPage = lazyWithRetry(() => import('./pages/WorkingWithUsPage.jsx'));
const AboutUsPage = lazyWithRetry(() => import('./pages/AboutUsPage.jsx'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage.jsx'));
const BlogPage = lazyWithRetry(() => import('./pages/blog/BlogPage.jsx'));
const BlogPostPage = lazyWithRetry(() => import('./pages/blog/BlogPostPage.jsx'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage.jsx'));
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage.jsx'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage.jsx'));

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
              <ErrorBoundary>
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
                    <Route path="/about-us" element={<AboutUsPage />} />
                    <Route path="/about-us/" element={<AboutUsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/contact/" element={<ContactPage />} />
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
              </ErrorBoundary>
            </TransitionProvider>
          </LenisProvider>
        </RAFProvider>
        <EmailCaptureForm />
        <CookieConsent />
      </BrowserRouter>
    </HelmetProvider>
  </LoadingProvider>
);
