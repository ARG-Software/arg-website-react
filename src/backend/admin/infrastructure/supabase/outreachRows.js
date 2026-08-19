export function toOutreachRecord(row, payloadCipher) {
  return {
    id: row.id,
    sourceRound: row.source_round,
    sourceRowNumber: row.source_row_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: payloadCipher.decrypt(row),
  };
}
