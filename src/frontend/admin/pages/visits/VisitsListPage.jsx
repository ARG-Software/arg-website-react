import { useState } from 'react';
import { VisitDeleteDialog } from '../../components/visits/VisitDeleteDialog.jsx';
import { VisitSessionsTable } from '../../components/visits/VisitSessionsTable.jsx';
import {
  useAllVisitSessions,
  useDeleteVisitSession,
} from '../../queries/visits/useVisitQueries.js';
import { PAGE_SIZE } from '../../shared/constants.js';
import { ErrorCard } from '../../shared/ErrorCard.jsx';

export default function VisitsListPage({ onSelectVisitSession }) {
  const [sessionPage, setSessionPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sessionsQuery = useAllVisitSessions(
    { page: sessionPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const deleteMutation = useDeleteVisitSession();

  async function deleteVisit() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.sessionHash);
    setDeleteTarget(null);
    onSelectVisitSession(null);
  }

  return (
    <div className="admin-content-grid">
      {sessionsQuery.isError ? (
        <ErrorCard error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (
        <VisitSessionsTable
          title="All visits"
          description="Every recorded visit, ordered by latest activity. Open a row to view the ordered page journey."
          query={sessionsQuery}
          onPageChange={setSessionPage}
          onSelectVisitSession={onSelectVisitSession}
          onDelete={setDeleteTarget}
          deleteMutation={deleteMutation}
        />
      )}
      <VisitDeleteDialog
        deleteTarget={deleteTarget}
        deleteMutation={deleteMutation}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteVisit}
      />
    </div>
  );
}
