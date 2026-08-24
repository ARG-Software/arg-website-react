import { useState } from 'react';
import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiField, UiSelect, UiTextarea } from '@ui/primitives/UiField.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { buildMailtoUrl, getStatusLabel, OUTREACH_STATUSES } from '../outreach.js';
import { useUpdateOutreachRecord } from '../queries/outreach/useOutreachQueries.js';
import { EMPTY_FORM } from '../shared/constants.js';

export function OutreachEditor({ record, onClose, onRecordUpdated }) {
  const [form, setForm] = useState(() => (record ? { ...EMPTY_FORM, ...record } : EMPTY_FORM));
  const [status, setStatus] = useState('');
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const saveMutation = useUpdateOutreachRecord();

  if (!record) return null;

  const isSaving = saveMutation.isPending;
  const isSentRecord = record.status === 'sent';
  const isContactForm = form.contactMethod === 'contact_form';

  async function saveChanges(changes = form) {
    setStatus('');
    try {
      const data = await saveMutation.mutateAsync({ id: record.id, changes });
      setForm(current => ({ ...current, ...data.record }));
      onRecordUpdated(data.record);
      setStatus('Saved');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
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
            onClick={() => setSendConfirmOpen(true)}
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
          label="Follow up date"
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
