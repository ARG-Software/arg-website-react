import { useState } from 'react';
import { VisitDeleteDialog } from '../../components/visits/VisitDeleteDialog.jsx';
import { VisitSessionsTable } from '../../components/visits/VisitSessionsTable.jsx';
import {
  useAllVisitSessions,
  useDeleteVisitSessions,
} from '../../queries/visits/useVisitQueries.js';
import { PAGE_SIZE } from '../../shared/constants.js';
import { ErrorCard } from '../../shared/ErrorCard.jsx';

export default function VisitsListPage({ onSelectVisitSession }) {
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionSort, setSessionSort] = useState({ sortBy: 'startedAt', sortDirection: 'desc' });
  // Session hashes to delete: one from a row's Delete button, or the selected rows.
  const [deleteTargets, setDeleteTargets] = useState([]);
  const [selectedHashes, setSelectedHashes] = useState([]);
  const sessionsQuery = useAllVisitSessions(
    { ...sessionSort, page: sessionPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const deleteMutation = useDeleteVisitSessions();

  function changeSessionPage(page) {
    setSelectedHashes([]);
    setSessionPage(page);
  }

  function updateSessionSort(sortBy) {
    setSelectedHashes([]);
    setSessionPage(1);
    setSessionSort(current => createNextTableSort(current, sortBy));
  }

  async function deleteVisits() {
    await deleteMutation.mutateAsync(deleteTargets);
    setSelectedHashes(current => current.filter(hash => !deleteTargets.includes(hash)));
    setDeleteTargets([]);
    onSelectVisitSession(null);
  }

  return (
    <div className="admin-content-grid">
      {sessionsQuery.isError ? (
        <ErrorCard error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (
        <VisitSessionsTable
          title="All visits"
          description="Every recorded visit, ordered by start time. Open a row to view the ordered page journey."
          query={sessionsQuery}
          onPageChange={changeSessionPage}
          sort={sessionSort}
          onSortChange={updateSessionSort}
          onSelectVisitSession={onSelectVisitSession}
          onDelete={record => setDeleteTargets([record.sessionHash])}
          deleteMutation={deleteMutation}
          selection={{ selectedKeys: selectedHashes, onChange: setSelectedHashes }}
          onDeleteSelected={() => setDeleteTargets(selectedHashes)}
        />
      )}
      <VisitDeleteDialog
        count={deleteTargets.length}
        deleteMutation={deleteMutation}
        onCancel={() => setDeleteTargets([])}
        onConfirm={deleteVisits}
      />
    </div>
  );
}

function createNextTableSort(current, sortBy) {
  return {
    sortBy,
    sortDirection: current.sortBy === sortBy && current.sortDirection === 'asc' ? 'desc' : 'asc',
  };
}
