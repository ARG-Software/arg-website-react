import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { createEmptyTableData } from '../../shared/constants.js';
import { formatCountry, formatDateTime, formatDuration } from '../../shared/formatters.js';

export function VisitSessionsTable({
  title,
  description,
  query,
  onPageChange,
  sort,
  onSortChange,
  onSelectVisitSession,
  onDelete,
  deleteMutation,
}) {
  return (
    <AdminDataTable
      title={title}
      description={description}
      columns={getVisitSessionColumns()}
      rows={query.data?.records || []}
      sort={sort}
      onSortChange={onSortChange}
      loading={query.isLoading}
      pagination={{
        ...(query.data?.pagination ?? createEmptyTableData().pagination),
        onPageChange,
      }}
      emptyMessage="No visits found."
      onRowClick={onSelectVisitSession}
      rowActions={record => (
        <button
          type="button"
          className="admin-table-action admin-table-action--danger"
          disabled={deleteMutation.isPending}
          onClick={() => onDelete(record)}
        >
          Delete
        </button>
      )}
      tone="light"
    />
  );
}

function getVisitSessionColumns() {
  return [
    {
      key: 'startedAt',
      label: 'Started',
      render: record => formatDateTime(record.startedAt),
    },
    {
      key: 'city',
      label: 'Location',
      render: record => formatLocation(record),
    },
    { key: 'entryPath', label: 'Entry page', sortable: true },
    {
      key: 'referrer',
      label: 'Referrer',
      render: record => record.referrer || '(direct)',
    },
    {
      key: 'source',
      label: 'Source',
      render: formatSource,
    },
    { key: 'pageCount', label: 'Pages', sortable: true },
    { key: 'eventCount', label: 'Events', sortable: true },
    {
      key: 'durationMs',
      label: 'Duration',
      sortable: true,
      render: record => formatDuration(record.durationMs),
    },
    {
      key: 'lastSeenAt',
      label: 'Last seen',
      sortable: true,
      render: record => formatDateTime(record.lastSeenAt),
    },
  ];
}

function formatLocation(record) {
  return (
    [record.city, record.region, formatCountry(record.countryCode)]
      .filter(Boolean)
      .filter(value => value !== 'Unknown')
      .join(', ') || 'Unknown'
  );
}

function formatSource(record) {
  const source = record.source || (record.referrer ? '' : 'direct');
  const medium = record.medium ? ` / ${record.medium}` : '';

  return source ? `${source}${medium}` : '-';
}
