import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import App from './App.jsx';
import PartnersPage from './PartnersPage.jsx';
import ClientsPage from './ClientsPage.jsx';
import ArticlesPage from './ArticlesPage.jsx';
import ArticlePage from './ArticlePage.jsx';
import TeamPage from './TeamPage.jsx';
import { TransitionProvider } from './TransitionProvider.jsx';
import ScrollManager from './ScrollManager.jsx';
import './App.css';

function ArticlePageWrapper() {
  const { slug } = useParams();
  return <ArticlePage slug={slug} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <TransitionProvider>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticlePageWrapper />} />
        <Route path="/team" element={<TeamPage />} />
      </Routes>
    </TransitionProvider>
  </BrowserRouter>
);
