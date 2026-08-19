import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';

import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { AdminNav } from '@ui/admin/AdminNav.jsx';
import { AdminProfileMenu } from '@ui/admin/AdminProfileMenu.jsx';
import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { AmbientVideoBackground } from '@ui/layout/AmbientVideoBackground.jsx';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiField, UiSelect, UiTextarea } from '@ui/primitives/UiField.jsx';
import { UiSpinner } from '@ui/primitives/UiSpinner.jsx';
import { UiStat } from '@ui/primitives/UiStat.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { getSupabaseBrowserClient } from '../../admin/supabaseClient.js';
import {
  fetchOutreachChart,
  fetchOutreachRecords,
  fetchOutreachSummary,
  updateOutreachRecord,
} from '../../admin/outreachApi.js';
import { OUTREACH_STATUSES, buildMailtoUrl, getStatusLabel } from '../../admin/outreach.js';
import '@ui/styles.css';
import '../../styles/admin.css';

const EMPTY_FORM = {
  company_name: '',
  website: '',
  contact_name: '',
  contact_email: '',
  contact_info: '',
  contact_method: '',
  fit_reason: '',
  email_subject: '',
  email_body: '',
  status: 'draft',
  date_sent: '',
  follow_up_date: '',
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
  const [refreshKey, setRefreshKey] = useState(0);
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
    setSelectedRecord(null);
  }

  function handleRecordUpdated(record) {
    setSelectedRecord(record);
    setRefreshKey(current => current + 1);
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
    return <AdminLogin />;
  }

  return (
    <AdminShell
      actions={
        <AdminProfileMenu
          items={[
            { label: 'Settings', onClick: () => navigate(ADMIN_ROUTES.settings) },
            { label: 'Log out', onClick: handleSignOut },
          ]}
        />
      }
      nav={<AdminNav items={getAdminNavItems(location.pathname)} onNavigate={navigate} />}
    >
      {view === 'dashboard' && (
        <DashboardView
          accessToken={session.access_token}
          refreshKey={refreshKey}
          onSelectRecord={setSelectedRecord}
        />
      )}
      {view === 'sent' && (
        <RecordsView
          accessToken={session.access_token}
          refreshKey={refreshKey}
          title="Sent emails"
          description="All outreach records with sent status."
          query={{ status: 'sent' }}
          emptyMessage="No sent outreach records found."
          onSelectRecord={setSelectedRecord}
        />
      )}
      {view === 'notSent' && (
        <RecordsView
          accessToken={session.access_token}
          refreshKey={refreshKey}
          title="Not sent emails"
          description="Draft and ready outreach records only."
          query={{ statuses: 'draft,ready' }}
          emptyMessage="No draft or ready outreach records found."
          onSelectRecord={setSelectedRecord}
        />
      )}
      {view === 'settings' && <SettingsView supabase={clientState.supabase} session={session} />}

      <OutreachEditor
        accessToken={session.access_token}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onRecordUpdated={handleRecordUpdated}
      />
    </AdminShell>
  );
}

function AdminShell({ actions, nav, children }) {
  return (
    <main className="admin-page">
      <Helmet>
        <title>ARG Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <header className="admin-header">
        {nav && <div className="admin-nav-wrap">{nav}</div>}
        {actions && <div className="admin-header__actions">{actions}</div>}
      </header>
      {children}
    </main>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setIsSubmitting(true);

    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
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
            <UiButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </UiButton>
            {status && <p className="admin-error">{status}</p>}
          </form>
        </UiCard>
      </div>
    </div>
  );
}

function DashboardView({ accessToken, refreshKey, onSelectRecord }) {
  const [summary, setSummary] = useState(null);
  const [chartRange, setChartRange] = useState('30d');
  const [chartPoints, setChartPoints] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableData, setTableData] = useState(createEmptyTableData());
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    fetchOutreachSummary(accessToken)
      .then(data => {
        if (isCurrent) setSummary(data.summary);
      })
      .catch(error => {
        if (isCurrent) setError(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, refreshKey]);

  useEffect(() => {
    let isCurrent = true;

    fetchOutreachChart(accessToken, chartRange)
      .then(data => {
        if (isCurrent) setChartPoints(data.points || []);
      })
      .catch(error => {
        if (isCurrent) setError(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, chartRange, refreshKey]);

  useEffect(() => {
    let isCurrent = true;

    fetchOutreachRecords(accessToken, {
      scope: 'recent_sent',
      page: tablePage,
      pageSize: PAGE_SIZE,
    })
      .then(data => {
        if (!isCurrent) return;
        setTableData(data);
      })
      .catch(error => {
        if (isCurrent) setError(error.message);
      })
      .finally(() => {
        if (isCurrent) setTableLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, tablePage, refreshKey]);

  return (
    <div className="admin-content-grid">
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-stats-grid">
        <UiStat label="Total" value={summary?.total ?? '...'} detail="Encrypted records" />
        <UiStat label="Ready" value={summary?.ready ?? '...'} detail="Can be sent" />
        <UiStat label="Sent" value={summary?.sent ?? '...'} detail="Status is sent" />
        <UiStat label="Replies" value={summary?.replied ?? '...'} detail="Status is replied" />
      </div>
      <AdminMetricChart
        title="Sent vs replied"
        description="Outbound volume and replies for the selected time range."
        range={chartRange}
        ranges={CHART_RANGES}
        points={chartPoints}
        onRangeChange={setChartRange}
      />
      <AdminDataTable
        title="Latest sent"
        description="Latest 30 sent records, paginated 10 per page."
        columns={getRecordColumns()}
        rows={tableData.records}
        pagination={{ ...tableData.pagination, onPageChange: setTablePage }}
        loading={tableLoading}
        emptyMessage="No sent outreach records found."
        onRowClick={onSelectRecord}
      />
    </div>
  );
}

function RecordsView({
  accessToken,
  refreshKey,
  title,
  description,
  query,
  emptyMessage,
  onSelectRecord,
}) {
  const [page, setPage] = useState(1);
  const [tableData, setTableData] = useState(createEmptyTableData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    fetchOutreachRecords(accessToken, {
      ...query,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(data => {
        if (!isCurrent) return;
        setTableData(data);
        setError('');
      })
      .catch(error => {
        if (isCurrent) setError(error.message);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, page, query, refreshKey]);

  return (
    <div className="admin-content-grid">
      {error && <p className="admin-error">{error}</p>}
      <AdminDataTable
        title={title}
        description={description}
        columns={getRecordColumns()}
        rows={tableData.records}
        pagination={{ ...tableData.pagination, onPageChange: setPage }}
        loading={loading}
        emptyMessage={emptyMessage}
        onRowClick={onSelectRecord}
      />
    </div>
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
    <UiCard className="admin-settings-card">
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(record ? { ...EMPTY_FORM, ...record } : EMPTY_FORM);
    setStatus('');
  }, [record]);

  if (!record) return null;

  async function saveChanges(changes = form) {
    setIsSaving(true);
    setStatus('');

    try {
      const data = await updateOutreachRecord(accessToken, record.id, changes);
      onRecordUpdated(data.record);
      setStatus('Saved');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSaving(false);
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
      eyebrow={`${record.sourceRound || 'Unknown round'} · row ${record.sourceRowNumber || '-'}`}
      onClose={onClose}
      actions={
        <UiButton
          onClick={openEmailClient}
          disabled={form.status === 'sent' || (!form.contact_email && !form.contact_info)}
        >
          {form.status === 'sent' ? 'Already sent' : 'Send email'}
        </UiButton>
      }
    >
      <div className="admin-detail-status">
        <UiStatusPill status={form.status}>{getStatusLabel(form.status)}</UiStatusPill>
      </div>
      <form
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
          id="contact-name"
          label="Contact name"
          value={form.contact_name}
          onChange={event => updateField('contact_name', event.target.value)}
        />
        <UiField
          id="contact-email"
          label="Contact email"
          type="email"
          value={form.contact_email}
          onChange={event => updateField('contact_email', event.target.value)}
        />
        <UiField
          id="contact-method"
          label="Contact method"
          value={form.contact_method}
          onChange={event => updateField('contact_method', event.target.value)}
        />
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
        <UiTextarea
          id="fit-reason"
          label="Why good fit"
          value={form.fit_reason}
          onChange={event => updateField('fit_reason', event.target.value)}
        />
        <UiField
          id="email-subject"
          label="Email subject"
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
          <UiButton type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </UiButton>
          {status && <span className="admin-save-status">{status}</span>}
        </div>
      </form>
    </AdminRecordOverlay>
  );
}

function getRecordColumns() {
  return [
    { key: 'company_name', label: 'Company' },
    {
      key: 'contact',
      label: 'Contact',
      render: record =>
        record.contact_email || record.contact_info || record.website || 'No contact',
    },
    {
      key: 'status',
      label: 'Status',
      render: record => (
        <UiStatusPill status={record.status}>{getStatusLabel(record.status)}</UiStatusPill>
      ),
    },
    { key: 'date_sent', label: 'Date sent', render: record => record.date_sent || '-' },
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
