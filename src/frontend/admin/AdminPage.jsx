import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  QueryClientProvider,
  keepPreviousData,
  useIsFetching,
  useIsMutating,
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { AdminNav } from '@ui/admin/AdminNav.jsx';
import { AdminProfileMenu } from '@ui/admin/AdminProfileMenu.jsx';
import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { AmbientVideoBackground } from '@ui/layout/AmbientVideoBackground.jsx';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { Logo } from '@components/icons/Logo.jsx';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiField, UiSelect, UiTextarea } from '@ui/primitives/UiField.jsx';
import { UiSpinner } from '@ui/primitives/UiSpinner.jsx';
import { UiStat } from '@ui/primitives/UiStat.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { AltchaVerification } from '@components/forms/AltchaVerification.jsx';
import { adminQueryClient } from './queryClient.js';
import { getSupabaseBrowserClient } from './supabaseClient.js';
import {
  exportOutreachCsv,
  fetchOutreachChart,
  fetchOutreachRecords,
  fetchOutreachSummary,
  importOutreachCsv,
  loginAdmin,
  updateOutreachRecord,
} from './outreachApi.js';
import { OUTREACH_STATUSES, buildMailtoUrl, getStatusLabel } from './outreach.js';
import '@ui/styles.css';
import './admin.css';

const EMPTY_FORM = {
  company_name: '',
  website: '',
  contact_email: '',
  contact_info: '',
  contact_method: '',
  fit_reason: '',
  email_subject: '',
  email_body: '',
  status: 'not_sent',
  date_sent: '',
  follow_up_date: '',
  reply_obtained: false,
  reply_summary: '',
  notes: '',
};

const ADMIN_ROUTES = {
  dashboard: '/admin/',
  sent: '/admin/sent/',
  notSent: '/admin/not-sent/',
  settings: '/admin/settings/',
};

const CHART_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'monthly', label: 'Monthly' },
];

const PAGE_SIZE = 10;
const ADMIN_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clientState] = useState(() => {
    try {
      return { supabase: getSupabaseBrowserClient(), error: '' };
    } catch (error) {
      return { supabase: null, error: error.message };
    }
  });
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => !clientState.error);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const view = getAdminView(location.pathname);

  useEffect(() => {
    if (!clientState.supabase) {
      return undefined;
    }

    const { supabase } = clientState;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [clientState]);

  async function handleSignOut() {
    await clientState.supabase.auth.signOut();
    adminQueryClient.clear();
    setSelectedRecord(null);
  }

  useEffect(() => {
    if (!session || !clientState.supabase) return undefined;

    let timeoutId;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        clientState.supabase.auth.signOut();
        adminQueryClient.clear();
        setSelectedRecord(null);
      }, ADMIN_INACTIVITY_TIMEOUT_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    resetTimer();
    events.forEach(eventName => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach(eventName => window.removeEventListener(eventName, resetTimer));
    };
  }, [clientState.supabase, session]);

  function handleRecordUpdated(record) {
    setSelectedRecord(record);
  }

  if (clientState.error) {
    return (
      <AdminShell>
        <p className="admin-error">{clientState.error}</p>
      </AdminShell>
    );
  }

  if (authLoading) {
    return (
      <AdminShell>
        <div className="admin-loading">
          <UiSpinner label="Loading admin…" />
        </div>
      </AdminShell>
    );
  }

  if (!session) {
    return <AdminLogin supabase={clientState.supabase} />;
  }

  return (
    <QueryClientProvider client={adminQueryClient}>
      <AdminWorkspace
        pathname={location.pathname}
        view={view}
        supabase={clientState.supabase}
        session={session}
        navigate={navigate}
        selectedRecord={selectedRecord}
        onSelectRecord={setSelectedRecord}
        onRecordUpdated={handleRecordUpdated}
        onSignOut={handleSignOut}
      />
    </QueryClientProvider>
  );
}

function AdminShell({ actions, nav, loading = false, children }) {
  return (
    <main className="admin-page">
      <Helmet>
        <title>ARG Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <header className="admin-header">
        <div className="admin-header__top">
          <a href="/" className="admin-header__logo" aria-label="ARG Software home">
            <Logo />
          </a>
          {actions && <div className="admin-header__actions">{actions}</div>}
        </div>
        {nav && <div className="admin-nav-wrap">{nav}</div>}
      </header>
      {children}
      {loading && (
        <div className="admin-loading-overlay">
          <UiSpinner label="Working…" />
        </div>
      )}
    </main>
  );
}

function AdminWorkspace({
  pathname,
  view,
  supabase,
  session,
  navigate,
  selectedRecord,
  onSelectRecord,
  onRecordUpdated,
  onSignOut,
}) {
  const queryFetching = useIsFetching({ queryKey: ['outreach'] });
  const queryMutating = useIsMutating({ mutationKey: ['outreach'] });
  const pageLoading = queryFetching > 0 || queryMutating > 0;

  function handleRefresh() {
    adminQueryClient.invalidateQueries({ queryKey: ['outreach'] });
  }

  return (
    <AdminShell
      actions={
        <AdminProfileMenu
          items={[
            { label: 'Settings', onClick: () => navigate(ADMIN_ROUTES.settings) },
            { label: 'Log out', onClick: onSignOut },
          ]}
        />
      }
      nav={
        <AdminNav
          items={getAdminNavItems(pathname)}
          onNavigate={navigate}
          trailing={
            view !== 'settings' && (
              <button
                type="button"
                className="admin-nav__refresh"
                onClick={handleRefresh}
                disabled={pageLoading}
                aria-label="Refresh current tab"
              >
                ↻ Refresh
              </button>
            )
          }
        />
      }
      loading={pageLoading}
    >
      {view === 'dashboard' && (
        <DashboardView accessToken={session.access_token} onSelectRecord={onSelectRecord} />
      )}
      {view === 'sent' && (
        <RecordsView
          accessToken={session.access_token}
          title="Sent emails"
          description="All outreach records with sent status."
          query={{ status: 'sent' }}
          emptyMessage="No sent outreach records found."
          onSelectRecord={onSelectRecord}
        />
      )}
      {view === 'notSent' && (
        <RecordsView
          accessToken={session.access_token}
          title="Not sent emails"
          description="Outreach records that have not been sent yet."
          query={{ status: 'not_sent' }}
          emptyMessage="No not-sent outreach records found."
          onSelectRecord={onSelectRecord}
        />
      )}
      {view === 'settings' && <SettingsView supabase={supabase} session={session} />}

      <OutreachEditor
        key={selectedRecord?.id ?? 'closed'}
        accessToken={session.access_token}
        record={selectedRecord}
        onClose={() => onSelectRecord(null)}
        onRecordUpdated={onRecordUpdated}
      />
    </AdminShell>
  );
}

function AdminLogin({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [altchaState, setAltchaState] = useState('unverified');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const altcha = formData.get('altcha');

      if (!altcha) {
        throw new Error('Complete the verification before signing in.');
      }

      const data = await loginAdmin({
        email,
        password,
        altcha,
      });

      const { error } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (error) throw error;
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-login-page">
      <Helmet>
        <title>Admin Backoffice | ARG</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AmbientVideoBackground src="/videos/hero-video-opt.mp4" />
      <div className="admin-login-center">
        <ArgMarkIcon className="admin-login-mark" />
        <h1 className="admin-login-title">Admin Backoffice</h1>
        <UiCard className="admin-login-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <UiField
              id="admin-email"
              label="Email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
            <UiField
              id="admin-password"
              label="Password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
            <div className="admin-altcha">
              <AltchaVerification onStateChange={setAltchaState} />
            </div>
            <UiButton type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Signing in...'
                : altchaState === 'verified'
                  ? 'Sign in'
                  : 'Verify to sign in'}
            </UiButton>
            {status && <p className="admin-error">{status}</p>}
          </form>
        </UiCard>
      </div>
    </div>
  );
}

function DashboardView({ accessToken, onSelectRecord }) {
  const [chartRange, setChartRange] = useState('30d');
  const [tablePage, setTablePage] = useState(1);

  const summaryQuery = useQuery({
    queryKey: ['outreach', 'summary'],
    queryFn: () => fetchOutreachSummary(accessToken),
  });

  const chartQuery = useQuery({
    queryKey: ['outreach', 'chart', chartRange],
    queryFn: () => fetchOutreachChart(accessToken, chartRange),
  });

  const tableQuery = useQuery({
    queryKey: ['outreach', 'records', 'recent_sent', tablePage],
    queryFn: () =>
      fetchOutreachRecords(accessToken, {
        scope: 'recent_sent',
        page: tablePage,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const summary = summaryQuery.data?.summary;

  return (
    <div className="admin-content-grid">
      {summaryQuery.isError || chartQuery.isError ? (
        <ErrorCard
          error={summaryQuery.error ?? chartQuery.error}
          onRetry={() => {
            summaryQuery.refetch();
            chartQuery.refetch();
          }}
        />
      ) : (
        <>
          <div className="admin-stats-grid">
            <UiStat
              label="Total"
              value={summary?.total ?? '...'}
              detail="Encrypted records"
              tone="light"
            />
            <UiStat
              label="Not sent"
              value={summary?.notSent ?? '...'}
              detail="Not sent yet"
              tone="light"
            />
            <UiStat
              label="Sent"
              value={summary?.sent ?? '...'}
              detail="Status is sent"
              tone="light"
            />
            <UiStat
              label="Replies"
              value={summary?.repliesObtained ?? '...'}
              detail="Replies obtained"
              tone="light"
            />
          </div>
          <AdminMetricChart
            title="Sent and replies"
            description="Outbound volume and reply outcomes for the selected time range."
            range={chartRange}
            ranges={CHART_RANGES}
            points={chartQuery.data?.points || []}
            pie={chartQuery.data?.pie || []}
            onRangeChange={setChartRange}
            tone="light"
          />
        </>
      )}
      {tableQuery.isError ? (
        <ErrorCard error={tableQuery.error} onRetry={() => tableQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Latest sent"
          description="Latest 30 sent records, paginated 10 per page."
          columns={getRecordColumns()}
          rows={tableQuery.data?.records || []}
          pagination={{
            ...(tableQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setTablePage,
          }}
          emptyMessage="No sent outreach records found."
          onRowClick={onSelectRecord}
          tone="light"
        />
      )}
    </div>
  );
}

function RecordsView({ accessToken, title, description, query, emptyMessage, onSelectRecord }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sortBy: 'created_at', sortDirection: 'desc' });
  const [importStatus, setImportStatus] = useState('');
  const viewKey = JSON.stringify({ query, sort });

  const recordsQuery = useQuery({
    queryKey: ['outreach', 'records', viewKey, page],
    queryFn: () =>
      fetchOutreachRecords(accessToken, { ...query, ...sort, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  function handleSortChange(sortBy) {
    setPage(1);
    setSort(current => ({
      sortBy,
      sortDirection: current.sortBy === sortBy && current.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }

  async function handleExport() {
    const csv = await exportOutreachCsv(accessToken);
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

    setImportStatus('Importing...');

    try {
      const result = await importOutreachCsv(accessToken, await file.text());
      setImportStatus(`Imported ${result.imported} records.`);
      adminQueryClient.invalidateQueries({ queryKey: ['outreach'] });
    } catch (error) {
      setImportStatus(error.message);
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="admin-content-grid">
      <div className="admin-csv-actions">
        <UiButton type="button" onClick={handleExport}>
          Export CSV
        </UiButton>
        <label className="admin-csv-import">
          <span>Import CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={handleImport} />
        </label>
        {importStatus && <span className="admin-save-status">{importStatus}</span>}
      </div>
      {recordsQuery.isError ? (
        <ErrorCard error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title={title}
          description={description}
          columns={getRecordColumns()}
          rows={recordsQuery.data?.records || []}
          sort={sort}
          onSortChange={handleSortChange}
          pagination={{
            ...(recordsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage={emptyMessage}
          onRowClick={onSelectRecord}
          tone="light"
        />
      )}
    </div>
  );
}

function ErrorCard({ error, onRetry }) {
  return (
    <UiCard className="admin-error-card" tone="light">
      <p className="admin-error">Couldn't load data.</p>
      {error?.message && <p className="admin-error-detail">{error.message}</p>}
      <button type="button" className="admin-retry" onClick={onRetry}>
        Retry
      </button>
    </UiCard>
  );
}

function SettingsView({ supabase, session }) {
  const [name, setName] = useState(session.user?.user_metadata?.name || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');

    if (password && password !== passwordConfirm) {
      setStatus('Passwords do not match.');
      return;
    }

    setIsSaving(true);

    try {
      if (name.trim() !== (session.user?.user_metadata?.name || '')) {
        const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
        if (error) throw error;
      }

      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword('');
        setPasswordConfirm('');
      }

      setStatus('Settings updated.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <UiCard className="admin-settings-card" tone="light">
      <form className="admin-form" onSubmit={handleSubmit}>
        <UiField
          id="admin-settings-email"
          label="Email"
          value={session.user?.email || ''}
          disabled
        />
        <UiField
          id="admin-settings-name"
          label="Name"
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <UiField
          id="admin-settings-password"
          label="New password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          minLength={8}
        />
        <UiField
          id="admin-settings-password-confirm"
          label="Confirm new password"
          type="password"
          value={passwordConfirm}
          onChange={event => setPasswordConfirm(event.target.value)}
          minLength={8}
        />
        <div className="admin-detail-form__actions">
          <UiButton type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save settings'}
          </UiButton>
          {status && <span className="admin-save-status">{status}</span>}
        </div>
      </form>
    </UiCard>
  );
}

function OutreachEditor({ accessToken, record, onClose, onRecordUpdated }) {
  const [form, setForm] = useState(() => (record ? { ...EMPTY_FORM, ...record } : EMPTY_FORM));
  const [status, setStatus] = useState('');

  const saveMutation = useMutation({
    mutationKey: ['outreach'],
    mutationFn: changes => updateOutreachRecord(accessToken, record.id, changes),
    onSuccess: data => {
      onRecordUpdated(data.record);
      adminQueryClient.invalidateQueries({ queryKey: ['outreach', 'records'] });
    },
  });

  if (!record) return null;

  const isSaving = saveMutation.isPending;

  async function saveChanges(changes = form) {
    setStatus('');
    try {
      await saveMutation.mutateAsync(changes);
      setStatus('Saved');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function openEmailClient() {
    window.location.href = buildMailtoUrl(form);
  }

  return (
    <AdminRecordOverlay
      isOpen
      title={form.company_name || 'Untitled company'}
      onClose={onClose}
      actions={
        <>
          <UiButton
            onClick={openEmailClient}
            disabled={form.status === 'sent' || (!form.contact_email && !form.contact_info)}
          >
            {form.status === 'sent' ? 'Already sent' : 'Send email'}
          </UiButton>
          <UiButton type="submit" form="outreach-edit-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </UiButton>
        </>
      }
    >
      <div className="admin-detail-status">
        <UiStatusPill status={form.status}>{getStatusLabel(form.status)}</UiStatusPill>
      </div>
      <form
        id="outreach-edit-form"
        className="admin-detail-form"
        onSubmit={event => {
          event.preventDefault();
          saveChanges();
        }}
      >
        <UiField
          id="company-name"
          label="Company"
          value={form.company_name}
          onChange={event => updateField('company_name', event.target.value)}
        />
        <UiField
          id="website"
          label="Website"
          value={form.website}
          onChange={event => updateField('website', event.target.value)}
        />
        <UiField
          id="contact-email"
          label="Contact email"
          type="email"
          value={form.contact_email}
          onChange={event => updateField('contact_email', event.target.value)}
        />
        <UiSelect
          id="contact-method"
          label="Contact method"
          value={form.contact_method}
          onChange={event => updateField('contact_method', event.target.value)}
        >
          <option value="email">Email</option>
          <option value="contact_form">Contact form</option>
        </UiSelect>
        <UiSelect
          id="status"
          label="Status"
          value={form.status}
          onChange={event => updateField('status', event.target.value)}
        >
          {OUTREACH_STATUSES.map(item => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </UiSelect>
        <UiField
          id="date-sent"
          label="Date sent"
          type="date"
          value={form.date_sent || ''}
          onChange={event => updateField('date_sent', event.target.value)}
        />
        <UiField
          id="follow-up-date"
          label="Follow-up date"
          type="date"
          value={form.follow_up_date || ''}
          onChange={event => updateField('follow_up_date', event.target.value)}
        />
        <label className="admin-checkbox-field">
          <input
            type="checkbox"
            checked={Boolean(form.reply_obtained)}
            onChange={event => updateField('reply_obtained', event.target.checked)}
          />
          <span>Reply obtained</span>
        </label>
        <UiTextarea
          id="fit-reason"
          label="Why good fit"
          value={form.fit_reason}
          onChange={event => updateField('fit_reason', event.target.value)}
        />
        <UiField
          id="email-subject"
          label="Email subject"
          className="admin-detail-form__full"
          value={form.email_subject}
          onChange={event => updateField('email_subject', event.target.value)}
        />
        <UiTextarea
          id="email-body"
          label="Email draft"
          value={form.email_body}
          onChange={event => updateField('email_body', event.target.value)}
        />
        <UiTextarea
          id="reply-summary"
          label="Reply summary"
          value={form.reply_summary}
          onChange={event => updateField('reply_summary', event.target.value)}
        />
        <UiTextarea
          id="notes"
          label="Notes"
          value={form.notes}
          onChange={event => updateField('notes', event.target.value)}
        />

        <div className="admin-detail-form__actions">
          {status && <span className="admin-save-status">{status}</span>}
        </div>
      </form>
    </AdminRecordOverlay>
  );
}

function getRecordColumns() {
  return [
    { key: 'company_name', label: 'Company', sortable: true },
    {
      key: 'contact_email',
      label: 'Contact',
      sortable: true,
      render: record =>
        record.contact_email || record.contact_info || record.website || 'No contact',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: record => (
        <UiStatusPill status={record.status}>{getStatusLabel(record.status)}</UiStatusPill>
      ),
    },
    {
      key: 'date_sent',
      label: 'Date sent',
      sortable: true,
      render: record => record.date_sent || '-',
    },
    { key: 'follow_up_date', label: 'Follow up', render: record => record.follow_up_date || '-' },
  ];
}

function createEmptyTableData() {
  return {
    records: [],
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE,
      totalRecords: 0,
      totalPages: 1,
    },
  };
}

function getAdminView(pathname) {
  if (pathname.startsWith('/admin/sent')) return 'sent';
  if (pathname.startsWith('/admin/not-sent')) return 'notSent';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  return 'dashboard';
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
  ];
}
