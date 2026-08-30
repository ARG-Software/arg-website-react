import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  QueryClientProvider,
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query';
import { Logo } from '@components/icons/Logo.jsx';
import { AdminNav } from '@ui/admin/AdminNav.jsx';
import { AdminProfileMenu } from '@ui/admin/AdminProfileMenu.jsx';
import { UiSpinner } from '@ui/primitives/UiSpinner.jsx';
import { adminQueryClient } from './queryClient.js';
import { AuthProvider, useAuth } from './hooks/auth/useAuth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OutreachDashboardPage from './pages/outreach/OutreachDashboardPage.jsx';
import OutreachRecordsPage from './pages/outreach/OutreachRecordsPage.jsx';
import AssistantConversationsPage from './pages/AssistantConversationsPage.jsx';
import VisitsDashboardPage from './pages/visits/VisitsDashboardPage.jsx';
import VisitsListPage from './pages/visits/VisitsListPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { AssistantConversationOverlay } from './components/overlays/AssistantConversationOverlay.jsx';
import { OutreachEditor } from './components/overlays/OutreachEditor.jsx';
import { VisitJourneyOverlay } from './components/overlays/VisitJourneyOverlay.jsx';
import {
  useExportOutreachCsv,
  useImportOutreachCsv,
  useOutreachRecord,
} from './queries/outreach/useOutreachQueries.js';
import { useAssistantConversation } from './queries/assistant/useAssistantQueries.js';
import { ADMIN_ROUTES } from './shared/constants.js';
import '@ui/styles.css';
import './admin.css';

export default function AdminPage() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AuthProvider>
        <AdminController />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AdminController() {
  const location = useLocation();

  if (location.pathname.startsWith('/admin/login')) {
    return <LoginPage />;
  }

  return <AdminWorkspace />;
}

function AdminWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedVisitSession, setSelectedVisitSession] = useState(null);
  const exportMutation = useExportOutreachCsv();
  const importMutation = useImportOutreachCsv();
  const selectedRecordQuery = useOutreachRecord(selectedRecordId, {
    enabled: isAuthenticated && Boolean(selectedRecordId),
  });
  const queryFetching = useIsFetching({ queryKey: ['admin'] });
  const queryMutating = useIsMutating({ mutationKey: ['admin'] });
  const pageLoading = queryFetching > 0 || queryMutating > 0;
  const view = getAdminView(location.pathname);
  const visitsView = getVisitsView(location.pathname);
  const importStatus = getImportStatus(importMutation);
  const deepLinkedConversationId =
    view === 'aiBot' ? new URLSearchParams(location.search).get('conversationId') : '';
  const deepLinkedConversationQuery = useAssistantConversation(deepLinkedConversationId, {
    enabled: isAuthenticated,
  });
  const selectedRecord = selectedRecordQuery.data?.record;
  const selectedRecordForEditor =
    selectedRecord?.id === selectedRecordId ? selectedRecord : undefined;

  useEffect(() => {
    if (deepLinkedConversationQuery.data) {
      setSelectedConversation(deepLinkedConversationQuery.data);
    }
  }, [deepLinkedConversationQuery.data]);

  async function handleSignOut() {
    await signOut?.();
    setSelectedRecordId('');
    setSelectedConversation(null);
    setSelectedVisitSession(null);
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  }

  function handleSelectConversation(conversation) {
    setSelectedConversation(conversation);

    if (view !== 'aiBot') return;

    const params = new URLSearchParams(location.search);
    if (conversation?.id) {
      params.set('conversationId', conversation.id);
    } else {
      params.delete('conversationId');
    }

    const search = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
      },
      { replace: true }
    );
  }

  async function handleExport() {
    const csv = await exportMutation.mutateAsync();
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'outreach-records.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importMutation.mutateAsync(await file.text());
    } finally {
      event.target.value = '';
    }
  }

  if (isLoading) {
    return (
      <AdminShell>
        <div className="admin-loading">
          <UiSpinner label="Loading admin..." />
        </div>
      </AdminShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/admin/login?from=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return (
    <AdminShell
      actions={
        <AdminProfileMenu
          items={[
            { label: 'Settings', onClick: () => navigate(ADMIN_ROUTES.settings) },
            { label: 'Help', onClick: () => navigate(ADMIN_ROUTES.help) },
            { label: 'Log out', onClick: handleSignOut },
          ]}
        />
      }
      sectionNav={
        <nav className="admin-header-nav" aria-label="Admin sections">
          {getAdminTopNavItems(location.pathname).map(item => (
            <a
              key={item.href}
              className={item.isActive ? 'is-active' : ''}
              href={item.href}
              onClick={event => {
                event.preventDefault();
                navigate(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      }
      nav={
        isOutreachView(view) ? (
          <AdminNav
            items={getAdminNavItems(location.pathname)}
            onNavigate={navigate}
            trailing={
              <div className="admin-nav-actions">
                <button
                  type="button"
                  className="admin-nav__control"
                  onClick={handleExport}
                  disabled={pageLoading}
                >
                  Export CSV
                </button>
                <label className="admin-csv-import admin-csv-import--nav admin-nav__control">
                  <span>Import CSV</span>
                  <input type="file" accept=".csv,text/csv" onChange={handleImport} />
                </label>
                <button
                  type="button"
                  className="admin-nav__refresh admin-nav__control"
                  onClick={handleRefresh}
                  disabled={pageLoading}
                  aria-label="Refresh current tab"
                >
                  Refresh
                </button>
                {importStatus && <span className="admin-save-status">{importStatus}</span>}
              </div>
            }
          />
        ) : view === 'visits' ? (
          <AdminNav items={getVisitNavItems(location.pathname)} onNavigate={navigate} />
        ) : null
      }
      loading={pageLoading}
    >
      {renderAdminFragment(view, {
        userEmail: user?.email,
        onSelectRecord: record => setSelectedRecordId(record.id),
        onSelectConversation: handleSelectConversation,
        onSelectVisitSession: setSelectedVisitSession,
        visitsView,
      })}
      <OutreachEditor
        key={selectedRecordForEditor?.id || 'closed'}
        record={selectedRecordForEditor}
        onClose={() => setSelectedRecordId('')}
        onRecordUpdated={record => setSelectedRecordId(record.id)}
      />
      <AssistantConversationOverlay
        conversation={selectedConversation}
        onClose={() => handleSelectConversation(null)}
      />
      <VisitJourneyOverlay
        session={selectedVisitSession}
        onClose={() => setSelectedVisitSession(null)}
      />
    </AdminShell>
  );
}

function renderAdminFragment(view, handlers) {
  if (view === 'all') {
    return (
      <OutreachRecordsPage
        title="All emails"
        query={{}}
        emptyMessage="No outreach records found."
        onSelectRecord={handlers.onSelectRecord}
      />
    );
  }

  if (view === 'sent') {
    return (
      <OutreachRecordsPage
        title="Sent emails"
        query={{ status: 'sent' }}
        emptyMessage="No sent outreach records found."
        onSelectRecord={handlers.onSelectRecord}
      />
    );
  }

  if (view === 'notSent') {
    return (
      <OutreachRecordsPage
        title="Not sent emails"
        query={{ status: 'not_sent' }}
        emptyMessage="No not-sent outreach records found."
        onSelectRecord={handlers.onSelectRecord}
      />
    );
  }

  if (view === 'aiBot') {
    return <AssistantConversationsPage onSelectConversation={handlers.onSelectConversation} />;
  }

  if (view === 'visits') {
    if (handlers.visitsView === 'all') {
      return <VisitsListPage onSelectVisitSession={handlers.onSelectVisitSession} />;
    }

    return <VisitsDashboardPage onSelectVisitSession={handlers.onSelectVisitSession} />;
  }

  if (view === 'settings') {
    return <SettingsPage userEmail={handlers.userEmail} />;
  }

  if (view === 'help') {
    return <HelpPage />;
  }

  return <OutreachDashboardPage onSelectRecord={handlers.onSelectRecord} />;
}

function AdminShell({ actions, nav, sectionNav, loading = false, children }) {
  return (
    <main className="admin-page">
      <Helmet>
        <title>ARG Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <header className={`admin-header${nav ? ' admin-header--with-nav' : ''}`}>
        <div className="admin-header__top">
          <div className="admin-header__main">
            <a href="/" className="admin-header__logo" aria-label="ARG Software home">
              <Logo />
            </a>
            {sectionNav}
          </div>
          {actions && <div className="admin-header__actions">{actions}</div>}
        </div>
        {nav && <div className="admin-nav-wrap">{nav}</div>}
      </header>
      {children}
      {loading && (
        <div className="admin-loading-overlay">
          <UiSpinner label="Working..." />
        </div>
      )}
    </main>
  );
}

function getImportStatus(importMutation) {
  if (importMutation.isPending) return 'Importing...';
  if (importMutation.isError) return importMutation.error.message;
  if (importMutation.data?.imported !== undefined)
    return `Imported ${importMutation.data.imported} records.`;
  return '';
}

function getAdminView(pathname) {
  if (pathname.startsWith('/admin/all')) return 'all';
  if (pathname.startsWith('/admin/sent')) return 'sent';
  if (pathname.startsWith('/admin/not-sent')) return 'notSent';
  if (pathname.startsWith('/admin/ai-bot')) return 'aiBot';
  if (pathname.startsWith('/admin/visits')) return 'visits';
  if (pathname.startsWith('/admin/help')) return 'help';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  return 'dashboard';
}

function getVisitsView(pathname) {
  if (pathname.startsWith('/admin/visits/all')) return 'all';
  return 'dashboard';
}

function isOutreachView(view) {
  return ['dashboard', 'all', 'sent', 'notSent'].includes(view);
}

function getAdminTopNavItems(pathname) {
  const view = getAdminView(pathname);

  return [
    {
      href: ADMIN_ROUTES.dashboard,
      label: 'Outreach',
      isActive: isOutreachView(view),
    },
    { href: ADMIN_ROUTES.aiBot, label: 'AI Bot', isActive: view === 'aiBot' },
    { href: ADMIN_ROUTES.visits, label: 'Visits', isActive: view === 'visits' },
  ];
}

function getAdminNavItems(pathname) {
  return [
    {
      href: ADMIN_ROUTES.dashboard,
      label: 'Dashboard',
      isActive: getAdminView(pathname) === 'dashboard',
    },
    { href: ADMIN_ROUTES.sent, label: 'Sent', isActive: getAdminView(pathname) === 'sent' },
    {
      href: ADMIN_ROUTES.notSent,
      label: 'Not sent',
      isActive: getAdminView(pathname) === 'notSent',
    },
    { href: ADMIN_ROUTES.all, label: 'All', isActive: getAdminView(pathname) === 'all' },
  ];
}

function getVisitNavItems(pathname) {
  const view = getVisitsView(pathname);

  return [
    {
      href: ADMIN_ROUTES.visits,
      label: 'Dashboard',
      isActive: view === 'dashboard',
    },
    { href: ADMIN_ROUTES.visitsAll, label: 'All', isActive: view === 'all' },
  ];
}
