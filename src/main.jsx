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
const ClientsPage = lazy(() => import('./pages/ClientsPage.jsx'));
const ArticlesPage = lazy(() => import('./pages/articles/ArticlesPage.jsx'));
const ArticlePage = lazy(() => import('./pages/articles/ArticlePage.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));

function ArticlePageWrapper() {
  const { slug } = useParams();
  return <ArticlePage slug={slug} />;
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
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/" element={<ClientsPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/" element={<ArticlesPage />} />
              <Route path="/articles/:slug" element={<ArticlePageWrapper />} />
              <Route path="/articles/:slug/" element={<ArticlePageWrapper />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/team/" element={<TeamPage />} />
            </Routes>
          </Suspense>
        </TransitionProvider>
      </LenisProvider>
      <CookieConsent />
    </BrowserRouter>
  </HelmetProvider>
);
