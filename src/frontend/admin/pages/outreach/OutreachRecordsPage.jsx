import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import { AdminTableFilters } from '../../components/outreach/AdminTableFilters.jsx';
import { getOutreachRecordColumns } from '../../components/outreach/outreachRecordColumns.jsx';
import { useDebouncedValue } from '../../hooks/shared/useDebouncedValue.js';
import {
  useDeleteOutreachRecords,
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
  // Records to delete: one from a row's Delete button, or the selected rows.
  const [deleteTargets, setDeleteTargets] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState(EMPTY_TABLE_FILTERS);
  const debouncedCompanyName = useDebouncedValue(filters.companyName, SEARCH_DEBOUNCE_MS);
  const queryFilters = createTableQueryFilters(filters, debouncedCompanyName);
  const sort = { sortBy: 'companyName', sortDirection: 'asc' };
  const deleteMutation = useDeleteOutreachRecords();

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
  const records = recordsQuery.data?.records || [];

  function changePage(nextPage) {
    setSelectedIds([]);
    setPage(nextPage);
  }

  function handleFilterChange(field, value) {
    setSelectedIds([]);
    setPage(1);
    setFilters(current => ({ ...current, [field]: value }));
  }

  async function deleteRecords() {
    const ids = deleteTargets.map(record => record.id);

    await deleteMutation.mutateAsync(ids);
    setSelectedIds(current => current.filter(id => !ids.includes(id)));
    setDeleteTargets([]);
    deleteTargets.forEach(record => onRecordDeleted?.(record));
  }

  const many = deleteTargets.length > 1;
  let deleteLabel = many ? `Delete ${deleteTargets.length} records` : 'Delete record';
  if (deleteMutation.isPending) deleteLabel = 'Deleting...';

  return (
    <div className="admin-content-grid">
      {recordsQuery.isError ? (
        <ErrorCard error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title={title}
          filters={
            <>
              <AdminTableFilters filters={filters} onFilterChange={handleFilterChange} />
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  className="admin-table-action admin-table-action--danger"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    setDeleteTargets(records.filter(record => selectedIds.includes(record.id)))
                  }
                >
                  Delete selected ({selectedIds.length})
                </button>
              )}
            </>
          }
          columns={getOutreachRecordColumns()}
          rows={records}
          selection={{ selectedKeys: selectedIds, onChange: setSelectedIds }}
          sort={sort}
          pagination={{
            ...(recordsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: changePage,
          }}
          emptyMessage={emptyMessage}
          onRowClick={onSelectRecord}
          rowActions={record => (
            <button
              type="button"
              className="admin-table-action admin-table-action--danger"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTargets([record])}
            >
              Delete
            </button>
          )}
          tone="light"
        />
      )}
      <ConfirmDialog
        isOpen={deleteTargets.length > 0}
        title={
          many ? `Delete ${deleteTargets.length} outreach records?` : 'Delete this outreach record?'
        }
        cancelLabel={many ? 'Keep records' : 'Keep record'}
        confirmLabel={deleteLabel}
        confirmDisabled={deleteMutation.isPending}
        onCancel={() => setDeleteTargets([])}
        onConfirm={deleteRecords}
      >
        <p>
          This permanently removes {many ? 'these outreach entries' : 'the outreach entry'} from the
          admin database.
        </p>
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
