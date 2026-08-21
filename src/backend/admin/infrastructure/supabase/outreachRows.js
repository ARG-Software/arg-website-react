export function toOutreachRecord(row, payloadCipher) {
  const protectedFields = payloadCipher.decrypt(row);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    companyName: protectedFields.company_name || '',
    website: row.website || '',
    contactEmail: protectedFields.contact_email || '',
    contactInfo: row.contact_info || '',
    contactMethod: row.contact_method || 'email',
    fitReason: row.fit_reason || '',
    emailSubject: protectedFields.email_subject || '',
    emailBody: protectedFields.email_body || '',
    status: row.status || 'not_sent',
    dateSent: row.date_sent || '',
    followUpDate: row.follow_up_date || '',
    replyObtained: Boolean(row.reply_obtained),
    replySummary: row.reply_summary || '',
    notes: row.notes || '',
  };
}

export function toOutreachDatabaseRow(record, payloadCipher) {
  const encryptedFields = payloadCipher.encryptFields({
    company_name: record.companyName,
    contact_email: record.contactEmail,
    email_subject: record.emailSubject,
    email_body: record.emailBody,
  });

  return {
    ...encryptedFields,
    website: cleanNullable(record.website),
    contact_info: cleanNullable(record.contactInfo),
    contact_method: record.contactMethod,
    fit_reason: cleanNullable(record.fitReason),
    status: record.status,
    date_sent: cleanNullable(record.dateSent),
    follow_up_date: cleanNullable(record.followUpDate),
    reply_obtained: Boolean(record.replyObtained),
    reply_summary: cleanNullable(record.replySummary),
    notes: cleanNullable(record.notes),
  };
}

function cleanNullable(value) {
  const cleaned = String(value || '').trim();

  return cleaned || null;
}
