import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import { AdminTableFilters } from '../../components/outreach/AdminTableFilters.jsx';
import { getOutreachRecordColumns } from '../../components/outreach/outreachRecordColumns.jsx';
import { useDebouncedValue } from '../../hooks/shared/useDebouncedValue.js';
import {
  useDeleteOutreachRecord,
  useOutreachRecords,
} from '../../queries/outreach/useOutreachQueries.js';
import {
  EMPTY_TABLE_FILTERS,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  createEmptyTableData,
} from '../../shared/constants.js';
import { ErrorCard } from '../../shared/ErrorCard.jsx';

export default function OutreachRecordsPage({
  title,
  query = {},
  emptyMessage,
  onSelectRecord,
  onRecordDeleted,
}) {
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState(EMPTY_TABLE_FILTERS);
  const debouncedCompanyName = useDebouncedValue(filters.companyName, SEARCH_DEBOUNCE_MS);
  const queryFilters = createTableQueryFilters(filters, debouncedCompanyName);
  const sort = { sortBy: 'companyName', sortDirection: 'asc' };
  const deleteMutation = useDeleteOutreachRecord();

  const recordsQuery = useOutreachRecords(
    {
      ...query,
      ...sort,
      ...queryFilters,
      page,
      pageSize: PAGE_SIZE,
    },
    { keepPrevious: true }
  );

  function handleFilterChange(field, value) {
    setPage(1);
    setFilters(current => ({ ...current, [field]: value }));
  }

  async function deleteRecord() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    onRecordDeleted?.(deleteTarget);
  }

  return (
    <div className="admin-content-grid">
      {recordsQuery.isError ? (
        <ErrorCard error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title={title}
          filters={<AdminTableFilters filters={filters} onFilterChange={handleFilterChange} />}
          columns={getOutreachRecordColumns()}
          rows={recordsQuery.data?.records || []}
          sort={sort}
          pagination={{
            ...(recordsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage={emptyMessage}
          onRowClick={onSelectRecord}
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
        title="Delete this outreach record?"
        cancelLabel="Keep record"
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete record'}
        confirmDisabled={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteRecord}
      >
        <p>This permanently removes the outreach entry from the admin database.</p>
        {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
      </ConfirmDialog>
    </div>
  );
}

function createTableQueryFilters(filters, companyName) {
  return {
    companyName,
    contactMethod: filters.contactMethod,
    dateSentFrom: filters.dateSentFrom,
    dateSentTo: filters.dateSentTo,
  };
}
