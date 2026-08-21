export function toOutreachRecord(row, payloadCipher) {
  const protectedFields = payloadCipher.decrypt(row);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: {
      ...protectedFields,
      website: row.website || '',
      contact_info: row.contact_info || '',
      contact_method: row.contact_method || 'email',
      fit_reason: row.fit_reason || '',
      status: row.status || 'not_sent',
      date_sent: row.date_sent || '',
      follow_up_date: row.follow_up_date || '',
      reply_obtained: Boolean(row.reply_obtained),
      reply_summary: row.reply_summary || '',
      notes: row.notes || '',
    },
  };
}

export function toOutreachDatabaseRow(payload, payloadCipher) {
  return {
    ...payloadCipher.encryptFields(payload),
    website: cleanNullable(payload.website),
    contact_info: cleanNullable(payload.contact_info),
    contact_method: payload.contact_method,
    fit_reason: cleanNullable(payload.fit_reason),
    status: payload.status,
    date_sent: cleanNullable(payload.date_sent),
    follow_up_date: cleanNullable(payload.follow_up_date),
    reply_obtained: Boolean(payload.reply_obtained),
    reply_summary: cleanNullable(payload.reply_summary),
    notes: cleanNullable(payload.notes),
  };
}

function cleanNullable(value) {
  const cleaned = String(value || '').trim();

  return cleaned || null;
}
