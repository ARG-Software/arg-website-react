import { useDeferredValue, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiField, UiSelect, UiTextarea } from '@ui/primitives/UiField.jsx';
import { UiStat } from '@ui/primitives/UiStat.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { getSupabaseBrowserClient } from '../../admin/supabaseClient.js';
import { fetchOutreachRecords, updateOutreachRecord } from '../../admin/outreachApi.js';
import {
  OUTREACH_STATUSES,
  buildMailtoUrl,
  getRecordSearchText,
  getStatusLabel,
} from '../../admin/outreach.js';
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

export default function AdminPage() {
  const [clientState] = useState(() => {
    try {
      return { supabase: getSupabaseBrowserClient(), error: '' };
    } catch (error) {
      return { supabase: null, error: error.message };
    }
  });
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => !clientState.error);
  const [records, setRecords] = useState([]);
  const [recordsError, setRecordsError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const deferredQuery = useDeferredValue(query);

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

  useEffect(() => {
    if (!session?.access_token) return;

    let isCurrent = true;

    fetchOutreachRecords(session.access_token)
      .then(data => {
        if (!isCurrent) return;
        setRecords(data.records || []);
        setSelectedId(currentId => currentId || data.records?.[0]?.id || '');
      })
      .catch(error => {
        if (!isCurrent) return;
        setRecordsError(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [session?.access_token]);

  async function handleSignOut() {
    await clientState.supabase.auth.signOut();
    setRecords([]);
    setSelectedId('');
  }

  function handleRecordUpdated(record) {
    setRecords(currentRecords =>
      currentRecords.map(current => (current.id === record.id ? record : current))
    );
  }

  const filteredRecords = filterRecords(records, deferredQuery, statusFilter);
  const selectedRecord = records.find(record => record.id === selectedId) || filteredRecords[0];
  const stats = getStats(records);

  if (clientState.error) {
    return <AdminShell title="Admin configuration missing" message={clientState.error} />;
  }

  if (authLoading) {
    return <AdminShell title="Loading admin..." />;
  }

  if (!session) {
    return <AdminLogin />;
  }

  return (
    <AdminShell
      title="Outreach admin"
      message="Manage outbound agency outreach, edit custom drafts, track replies, and launch emails from your local client."
      actions={
        <UiButton onClick={handleSignOut} variant="secondary">
          Sign out
        </UiButton>
      }
    >
      <div className="admin-stats-grid">
        <UiStat label="Total" value={records.length} detail="Encrypted records" />
        <UiStat label="Ready" value={stats.ready} detail="Can be sent" />
        <UiStat label="Sent" value={stats.sent} detail="Date tracked" />
        <UiStat label="Replies" value={stats.replied} detail="Needs review" />
      </div>

      <section className="admin-workspace">
        <UiCard className="admin-list-card">
          <div className="admin-toolbar">
            <UiField
              id="admin-search"
              label="Search outreach"
              placeholder="Company, contact, round, notes..."
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
            <UiSelect
              id="admin-status-filter"
              label="Status"
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {OUTREACH_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </UiSelect>
          </div>

          {recordsError && <p className="admin-error">{recordsError}</p>}
          {!records.length && !recordsError ? (
            <p className="admin-muted">Loading encrypted outreach records...</p>
          ) : (
            <OutreachList
              records={filteredRecords}
              selectedId={selectedRecord?.id}
              onSelect={setSelectedId}
            />
          )}
        </UiCard>

        <OutreachDetail
          accessToken={session.access_token}
          record={selectedRecord}
          onRecordUpdated={handleRecordUpdated}
        />
      </section>
    </AdminShell>
  );
}

function AdminShell({ title, message, actions, children }) {
  return (
    <main className="admin-page">
      <Helmet>
        <title>{title} | ARG Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <header className="admin-header">
        <div>
          <p className="admin-kicker">ARG Software</p>
          <h1>{title}</h1>
          {message && <p>{message}</p>}
        </div>
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
    <AdminShell title="Admin login" message="Use your ARG admin Supabase account.">
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
    </AdminShell>
  );
}

function OutreachList({ records, selectedId, onSelect }) {
  if (!records.length) {
    return <p className="admin-muted">No outreach records match this filter.</p>;
  }

  return (
    <div className="admin-record-list">
      {records.map(record => (
        <button
          key={record.id}
          className={`admin-record-row${record.id === selectedId ? ' is-selected' : ''}`}
          type="button"
          onClick={() => onSelect(record.id)}
        >
          <span>
            <strong>{record.company_name || 'Untitled company'}</strong>
            <small>
              {record.contact_email || record.contact_info || record.website || 'No contact'}
            </small>
          </span>
          <UiStatusPill status={record.status}>{getStatusLabel(record.status)}</UiStatusPill>
        </button>
      ))}
    </div>
  );
}

function OutreachDetail({ accessToken, record, onRecordUpdated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(record ? { ...EMPTY_FORM, ...record } : EMPTY_FORM);
    setStatus('');
  }, [record]);

  if (!record) {
    return (
      <UiCard className="admin-detail-card">
        <p className="admin-muted">Select a record to see the detail.</p>
      </UiCard>
    );
  }

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
    <UiCard className="admin-detail-card">
      <div className="admin-detail-header">
        <div>
          <UiStatusPill status={form.status}>{getStatusLabel(form.status)}</UiStatusPill>
          <h2>{form.company_name || 'Untitled company'}</h2>
          <p>
            {record.sourceRound} · row {record.sourceRowNumber}
          </p>
        </div>
        <div className="admin-detail-header__actions">
          <UiButton onClick={openEmailClient} disabled={!form.contact_email && !form.contact_info}>
            Send email
          </UiButton>
          <UiButton
            variant="secondary"
            onClick={() => saveChanges({ ...form, status: 'sent' })}
            disabled={isSaving}
          >
            Mark sent
          </UiButton>
        </div>
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
    </UiCard>
  );
}

function filterRecords(records, query, statusFilter) {
  const normalizedQuery = query.trim().toLowerCase();

  return records.filter(record => {
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesQuery = !normalizedQuery || getRecordSearchText(record).includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}

function getStats(records) {
  return records.reduce(
    (stats, record) => {
      if (record.status === 'ready') stats.ready += 1;
      if (record.status === 'sent') stats.sent += 1;
      if (record.status === 'replied') stats.replied += 1;
      return stats;
    },
    { ready: 0, sent: 0, replied: 0 }
  );
}
