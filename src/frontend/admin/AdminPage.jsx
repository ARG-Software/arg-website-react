import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  QueryClientProvider,
  keepPreviousData,
  useIsFetching,
  useIsMutating,
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminConversationTranscript } from '@ui/admin/AdminConversationTranscript.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { AdminNav } from '@ui/admin/AdminNav.jsx';
import { AdminProfileMenu } from '@ui/admin/AdminProfileMenu.jsx';
import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import { Logo } from '@components/icons/Logo.jsx';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiDatePicker } from '@ui/primitives/UiDatePicker.jsx';
import { UiField, UiSelect, UiTextarea } from '@ui/primitives/UiField.jsx';
import { UiSpinner } from '@ui/primitives/UiSpinner.jsx';
import { UiStat } from '@ui/primitives/UiStat.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { adminQueryClient } from './queryClient.js';
import {
  deleteAssistantConversation,
  fetchAssistantConversation,
  fetchAssistantConversations,
} from './apis/assistantConversationsApi.js';
import {
  exportOutreachCsv,
  fetchOutreachChart,
  fetchOutreachRecords,
  fetchOutreachSummary,
  importOutreachCsv,
  updateOutreachRecord,
} from './apis/outreachApi.js';
import { updateUser } from './apis/authApi.js';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { OUTREACH_STATUSES, buildMailtoUrl, getStatusLabel } from './outreach.js';
import '@ui/styles.css';
import './admin.css';

const EMPTY_FORM = {
  companyName: '',
  website: '',
  contactEmail: '',
  contactInfo: '',
  contactMethod: '',
  fitReason: '',
  emailSubject: '',
  emailBody: '',
  status: 'not_sent',
  dateSent: '',
  followUpDate: '',
  replyObtained: false,
  replySummary: '',
  notes: '',
};

const ADMIN_ROUTES = {
  dashboard: '/admin/',
  all: '/admin/all/',
  sent: '/admin/sent/',
  notSent: '/admin/not-sent/',
  aiBot: '/admin/ai-bot/',
  help: '/admin/help/',
  settings: '/admin/settings/',
};

const CHART_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'monthly', label: 'Monthly' },
];

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

const EMPTY_TABLE_FILTERS = {
  companyName: '',
  dateSentFrom: '',
  dateSentTo: '',
};

export default function AdminPage() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AuthProvider>
        <AdminContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AdminContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const view = getAdminView(location.pathname);

  function handleSignOut() {
    signOut?.();
    setSelectedRecord(null);
    setSelectedConversation(null);
  }

  function handleRecordUpdated(record) {
    setSelectedRecord(record);
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
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminWorkspace
      pathname={location.pathname}
      view={view}
      navigate={navigate}
      userEmail={user?.email}
      selectedRecord={selectedRecord}
      selectedConversation={selectedConversation}
      onSelectRecord={setSelectedRecord}
      onSelectConversation={setSelectedConversation}
      onRecordUpdated={handleRecordUpdated}
      onSignOut={handleSignOut}
    />
  );
}

function AdminShell({ actions, nav, sectionNav, loading = false, children }) {
  return (
    <main className="admin-page">
      <Helmet>
        <title>ARG Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <header className="admin-header">
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

function AdminWorkspace({
  pathname,
  view,
  navigate,
  userEmail,
  selectedRecord,
  selectedConversation,
  onSelectRecord,
  onSelectConversation,
  onRecordUpdated,
  onSignOut,
}) {
  const queryFetching = useIsFetching({ queryKey: ['outreach'] });
  const conversationFetching = useIsFetching({ queryKey: ['assistantConversations'] });
  const queryMutating = useIsMutating({ mutationKey: ['outreach'] });
  const conversationMutating = useIsMutating({ mutationKey: ['assistantConversations'] });
  const [importStatus, setImportStatus] = useState('');
  const pageLoading =
    queryFetching > 0 || conversationFetching > 0 || queryMutating > 0 || conversationMutating > 0;

  function handleRefresh() {
    adminQueryClient.invalidateQueries({ queryKey: ['outreach'] });
    adminQueryClient.invalidateQueries({ queryKey: ['assistantConversations'] });
  }

  const topNavItems = getAdminTopNavItems(pathname);

  async function handleExport() {
    const csv = await exportOutreachCsv();
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
      const result = await importOutreachCsv(await file.text());
      setImportStatus(`Imported ${result.imported} records.`);
      adminQueryClient.invalidateQueries({ queryKey: ['outreach'] });
    } catch (error) {
      setImportStatus(error.message);
    } finally {
      event.target.value = '';
    }
  }

  return (
    <AdminShell
      actions={
        <AdminProfileMenu
          items={[
            { label: 'Settings', onClick: () => navigate(ADMIN_ROUTES.settings) },
            { label: 'Help', onClick: () => navigate(ADMIN_ROUTES.help) },
            { label: 'Log out', onClick: onSignOut },
          ]}
        />
      }
      sectionNav={
        <nav className="admin-header-nav" aria-label="Admin sections">
          {topNavItems.map(item => (
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
            items={getAdminNavItems(pathname)}
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
        ) : null
      }
      loading={pageLoading}
    >
      {view === 'dashboard' && <DashboardView onSelectRecord={onSelectRecord} />}
      {view === 'all' && (
        <RecordsView
          title="All emails"
          query={{}}
          emptyMessage="No outreach records found."
          onSelectRecord={onSelectRecord}
        />
      )}
      {view === 'sent' && (
        <RecordsView
          title="Sent emails"
          query={{ status: 'sent' }}
          emptyMessage="No sent outreach records found."
          onSelectRecord={onSelectRecord}
        />
      )}
      {view === 'notSent' && (
        <RecordsView
          title="Not sent emails"
          query={{ status: 'not_sent' }}
          emptyMessage="No not-sent outreach records found."
          onSelectRecord={onSelectRecord}
        />
      )}
      {view === 'aiBot' && (
        <AssistantConversationsView onSelectConversation={onSelectConversation} />
      )}
      {view === 'settings' && <SettingsView userEmail={userEmail} />}
      {view === 'help' && <HelpView />}

      <OutreachEditor
        key={selectedRecord?.id ?? 'closed'}
        record={selectedRecord}
        onClose={() => onSelectRecord(null)}
        onRecordUpdated={onRecordUpdated}
      />
      <AssistantConversationOverlay
        conversation={selectedConversation}
        onClose={() => onSelectConversation(null)}
      />
    </AdminShell>
  );
}

function DashboardView({ onSelectRecord }) {
  const [chartRange, setChartRange] = useState('30d');
  const [tablePage, setTablePage] = useState(1);
  const [tableSort, setTableSort] = useState({ sortBy: 'dateSent', sortDirection: 'desc' });
  const [tableFilters, setTableFilters] = useState(EMPTY_TABLE_FILTERS);
  const debouncedCompanyName = useDebouncedValue(tableFilters.companyName, SEARCH_DEBOUNCE_MS);
  const tableQueryFilters = createTableQueryFilters(tableFilters, debouncedCompanyName);

  const summaryQuery = useQuery({
    queryKey: ['outreach', 'summary'],
    queryFn: () => fetchOutreachSummary(),
  });

  const chartQuery = useQuery({
    queryKey: ['outreach', 'chart', chartRange],
    queryFn: () => fetchOutreachChart(chartRange),
  });

  const tableQuery = useQuery({
    queryKey: ['outreach', 'records', 'recent_sent', tableSort, tableQueryFilters, tablePage],
    queryFn: () =>
      fetchOutreachRecords({
        scope: 'recent_sent',
        ...tableSort,
        ...tableQueryFilters,
        page: tablePage,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const summary = summaryQuery.data?.summary;

  function handleTableSortChange(sortBy) {
    setTablePage(1);
    setTableSort(current => createNextTableSort(current, sortBy));
  }

  function handleTableFilterChange(field, value) {
    setTablePage(1);
    setTableFilters(current => ({ ...current, [field]: value }));
  }

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
            <UiStat label="Total" value={summary?.total ?? '...'} tone="light" />
            <UiStat label="Not sent" value={summary?.notSent ?? '...'} tone="light" />
            <UiStat label="Sent" value={summary?.sent ?? '...'} tone="light" />
            <UiStat label="Replies" value={summary?.repliesObtained ?? '...'} tone="light" />
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
          filters={
            <AdminTableFilters filters={tableFilters} onFilterChange={handleTableFilterChange} />
          }
          columns={getRecordColumns()}
          rows={tableQuery.data?.records || []}
          sort={tableSort}
          onSortChange={handleTableSortChange}
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

function RecordsView({ title, query, emptyMessage, onSelectRecord }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sortBy: 'companyName', sortDirection: 'asc' });
  const [filters, setFilters] = useState(EMPTY_TABLE_FILTERS);
  const debouncedCompanyName = useDebouncedValue(filters.companyName, SEARCH_DEBOUNCE_MS);
  const queryFilters = createTableQueryFilters(filters, debouncedCompanyName);
  const viewKey = JSON.stringify({ query, sort, queryFilters });

  const recordsQuery = useQuery({
    queryKey: ['outreach', 'records', viewKey, page],
    queryFn: () =>
      fetchOutreachRecords({
        ...query,
        ...sort,
        ...queryFilters,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  function handleSortChange(sortBy) {
    setPage(1);
    setSort(current => createNextTableSort(current, sortBy));
  }

  function handleFilterChange(field, value) {
    setPage(1);
    setFilters(current => ({ ...current, [field]: value }));
  }

  return (
    <div className="admin-content-grid">
      {recordsQuery.isError ? (
        <ErrorCard error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title={title}
          filters={<AdminTableFilters filters={filters} onFilterChange={handleFilterChange} />}
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

function AssistantConversationsView({ onSelectConversation }) {
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const conversationsQuery = useQuery({
    queryKey: ['assistantConversations', 'records', page],
    queryFn: () => fetchAssistantConversations({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const deleteMutation = useMutation({
    mutationKey: ['assistantConversations'],
    mutationFn: id => deleteAssistantConversation(id),
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ['assistantConversations'] });
      setDeleteTarget(null);
      onSelectConversation(null);
    },
  });

  async function deleteConversation() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.id);
  }

  return (
    <div className="admin-content-grid">
      {conversationsQuery.isError ? (
        <ErrorCard error={conversationsQuery.error} onRetry={() => conversationsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="AI Bot conversations"
          description="Encrypted Gaspar conversations saved after visitors pause or leave the chat."
          columns={getConversationColumns()}
          rows={conversationsQuery.data?.records || []}
          pagination={{
            ...(conversationsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage="No assistant conversations found."
          onRowClick={onSelectConversation}
          rowActions={record => (
            <button
              type="button"
              className="admin-table-action admin-table-action--danger"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTarget(record)}
            >
              Delete
            </button>
          )}
          tone="light"
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this conversation?"
        cancelLabel="Keep conversation"
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete conversation'}
        confirmDisabled={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteConversation}
      >
        <p>This permanently removes the encrypted transcript from the admin database.</p>
        {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
      </ConfirmDialog>
    </div>
  );
}

function AdminTableFilters({ filters, onFilterChange }) {
  return (
    <div className="admin-table-filters">
      <UiField
        id="admin-company-search"
        aria-label="Search by company name"
        type="search"
        placeholder="Search company name"
        value={filters.companyName}
        onChange={event => onFilterChange('companyName', event.target.value)}
      />
      <UiDatePicker
        id="admin-date-sent-from"
        aria-label="Date sent from"
        value={filters.dateSentFrom}
        onChange={event => onFilterChange('dateSentFrom', event.target.value)}
      />
      <UiDatePicker
        id="admin-date-sent-to"
        aria-label="Date sent to"
        value={filters.dateSentTo}
        onChange={event => onFilterChange('dateSentTo', event.target.value)}
      />
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

function SettingsView({ userEmail }) {
  const [name, setName] = useState('');
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
      if (name) {
        await updateUser({ name });
      }

      if (password) {
        await updateUser({ password });
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
        <UiField id="admin-settings-email" label="Email" value={userEmail || ''} disabled />
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

function HelpView() {
  return (
    <UiCard className="admin-help-card" tone="light">
      <h1>Admin help</h1>
      <section className="admin-help-section">
        <h2>Import outreach CSV</h2>
        <p>
          Use Export CSV first when you need a template. Keep the same column names, edit the rows
          you want to add, then import a CSV file from the admin navigation.
        </p>
        <ol>
          <li>Prepare a CSV with no more than 30 data rows per import.</li>
          <li>
            Keep <code>companyName</code> filled in for every row.
          </li>
          <li>
            Use <code>sent</code> or <code>not_sent</code> for <code>status</code>.
          </li>
          <li>
            Use <code>email</code> or <code>contact_form</code> for <code>contactMethod</code>.
          </li>
          <li>
            Use <code>YYYY-MM-DD</code> for <code>dateSent</code> and <code>followUpDate</code>.
          </li>
          <li>
            Set <code>replyObtained</code> to <code>true</code> only when a sent record already has
            a reply.
          </li>
        </ol>
      </section>
      <section className="admin-help-section">
        <h2>Duplicate checks</h2>
        <p>
          Imports reject rows when the normalized company name or contact email already exists.
          Company names and contact emails stay encrypted at rest, and the duplicate check uses
          blind indexes.
        </p>
      </section>
      <section className="admin-help-section">
        <h2>After importing</h2>
        <p>
          Refresh the admin view if needed, then review imported rows in All emails before sending
          or editing outreach details.
        </p>
      </section>
    </UiCard>
  );
}

function OutreachEditor({ record, onClose, onRecordUpdated }) {
  const [form, setForm] = useState(() => (record ? { ...EMPTY_FORM, ...record } : EMPTY_FORM));
  const [status, setStatus] = useState('');
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);

  const saveMutation = useMutation({
    mutationKey: ['outreach'],
    mutationFn: changes => updateOutreachRecord(record.id, changes),
    onSuccess: data => {
      setForm(current => ({ ...current, ...data.record }));
      onRecordUpdated(data.record);
      adminQueryClient.invalidateQueries({ queryKey: ['outreach', 'records'] });
    },
  });

  if (!record) return null;

  const isSaving = saveMutation.isPending;
  const isSentRecord = record.status === 'sent';
  const isContactForm = form.contactMethod === 'contact_form';

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
    setSendConfirmOpen(true);
  }

  function openEmailDraft() {
    window.location.href = buildMailtoUrl(form);
  }

  function sendWithoutMarking() {
    setSendConfirmOpen(false);
    openEmailDraft();
  }

  async function markEmailAsSent() {
    setSendConfirmOpen(false);
    await saveChanges({ status: 'sent' });
    openEmailDraft();
  }

  return (
    <AdminRecordOverlay
      isOpen
      title={form.companyName || 'Untitled company'}
      titleAccessory={
        <UiStatusPill status={form.status}>{getStatusLabel(form.status)}</UiStatusPill>
      }
      onClose={onClose}
      actions={
        <>
          <UiButton
            onClick={openEmailClient}
            disabled={form.status === 'sent' || (!form.contactEmail && !form.contactInfo)}
          >
            {form.status === 'sent' ? 'Already sent' : 'Send email'}
          </UiButton>
          <UiButton type="submit" form="outreach-edit-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </UiButton>
        </>
      }
    >
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
          value={form.companyName}
          onChange={event => updateField('companyName', event.target.value)}
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
          value={form.contactEmail}
          disabled={isContactForm}
          onChange={event => updateField('contactEmail', event.target.value)}
        />
        <UiSelect
          id="contact-method"
          label="Contact method"
          value={form.contactMethod}
          disabled={isSentRecord}
          onChange={event => updateField('contactMethod', event.target.value)}
        >
          <option value="email">Email</option>
          <option value="contact_form">Contact form</option>
        </UiSelect>
        <UiSelect
          id="status"
          label="Status"
          value={form.status}
          disabled={isSentRecord}
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
          value={form.dateSent || ''}
          disabled={isSentRecord}
          onChange={event => updateField('dateSent', event.target.value)}
        />
        <UiField
          id="follow-up-date"
          label="Follow-up date"
          type="date"
          value={form.followUpDate || ''}
          onChange={event => updateField('followUpDate', event.target.value)}
        />
        <label className="admin-checkbox-field">
          <input
            type="checkbox"
            checked={Boolean(form.replyObtained)}
            onChange={event => updateField('replyObtained', event.target.checked)}
          />
          <span>Reply obtained</span>
        </label>
        <UiTextarea
          id="fit-reason"
          label="Why good fit"
          value={form.fitReason}
          onChange={event => updateField('fitReason', event.target.value)}
        />
        <UiField
          id="email-subject"
          label="Email subject"
          className="admin-detail-form__full"
          value={form.emailSubject}
          onChange={event => updateField('emailSubject', event.target.value)}
        />
        <UiTextarea
          id="email-body"
          label="Email draft"
          value={form.emailBody}
          onChange={event => updateField('emailBody', event.target.value)}
        />
        <UiTextarea
          id="reply-summary"
          label="Reply summary"
          value={form.replySummary}
          onChange={event => updateField('replySummary', event.target.value)}
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
      <ConfirmDialog
        isOpen={sendConfirmOpen}
        title="Mark this outreach email as sent?"
        cancelLabel="Don't mark as sent"
        confirmLabel="Mark as sent"
        confirmDisabled={isSaving}
        onCancel={sendWithoutMarking}
        onConfirm={markEmailAsSent}
      >
        <p>Choose whether to lock the record as sent before opening the email draft.</p>
      </ConfirmDialog>
    </AdminRecordOverlay>
  );
}

function AssistantConversationOverlay({ conversation, onClose }) {
  const detailQuery = useQuery({
    queryKey: ['assistantConversations', 'detail', conversation?.id],
    queryFn: () => fetchAssistantConversation(conversation.id),
    enabled: Boolean(conversation?.id),
  });

  if (!conversation) return null;

  const record = detailQuery.data?.record || conversation;

  return (
    <AdminRecordOverlay
      isOpen
      title={record.preview || 'Assistant conversation'}
      eyebrow={formatDateTime(record.lastMessageAt || record.updatedAt)}
      onClose={onClose}
      tone="light"
    >
      <div className="admin-conversation-meta">
        <span>Page: {record.pagePath || '-'}</span>
        <span>Language: {record.language || '-'}</span>
        <span>Messages: {record.messageCount || 0}</span>
      </div>
      {detailQuery.isError && (
        <ErrorCard error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
      )}
      {!detailQuery.isError && detailQuery.isLoading && (
        <UiSpinner label="Loading conversation..." />
      )}
      {!detailQuery.isError && !detailQuery.isLoading && (
        <AdminConversationTranscript messages={record.messages || []} />
      )}
    </AdminRecordOverlay>
  );
}

function getRecordColumns() {
  return [
    { key: 'companyName', label: 'Company', sortable: true },
    {
      key: 'contactEmail',
      label: 'Contact',
      render: record => record.contactEmail || record.contactInfo || record.website || 'No contact',
    },
    {
      key: 'status',
      label: 'Status',
      render: record => (
        <UiStatusPill status={record.status}>{getStatusLabel(record.status)}</UiStatusPill>
      ),
    },
    {
      key: 'dateSent',
      label: 'Date sent',
      sortable: true,
      render: record => record.dateSent || '-',
    },
    {
      key: 'followUpDate',
      label: 'Follow up',
      sortable: true,
      render: record => record.followUpDate || '-',
    },
  ];
}

function getConversationColumns() {
  return [
    {
      key: 'lastMessageAt',
      label: 'Last activity',
      render: record => formatDateTime(record.lastMessageAt || record.updatedAt),
    },
    {
      key: 'preview',
      label: 'Conversation',
      render: record => record.preview || `Conversation on ${record.pagePath || 'unknown page'}`,
    },
    {
      key: 'pagePath',
      label: 'Page',
      render: record => record.pagePath || '-',
    },
    {
      key: 'messageCount',
      label: 'Messages',
      render: record => record.messageCount || 0,
    },
    {
      key: 'language',
      label: 'Language',
      render: record => record.language || '-',
    },
  ];
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function createNextTableSort(current, sortBy) {
  return {
    sortBy,
    sortDirection: current.sortBy === sortBy && current.sortDirection === 'asc' ? 'desc' : 'asc',
  };
}

function createTableQueryFilters(filters, companyName) {
  return {
    companyName,
    dateSentFrom: filters.dateSentFrom,
    dateSentTo: filters.dateSentTo,
  };
}

function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
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
  if (pathname.startsWith('/admin/all')) return 'all';
  if (pathname.startsWith('/admin/sent')) return 'sent';
  if (pathname.startsWith('/admin/not-sent')) return 'notSent';
  if (pathname.startsWith('/admin/ai-bot')) return 'aiBot';
  if (pathname.startsWith('/admin/help')) return 'help';
  if (pathname.startsWith('/admin/settings')) return 'settings';
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
