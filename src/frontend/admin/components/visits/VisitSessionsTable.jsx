import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { createEmptyTableData } from '../../shared/constants.js';
import { formatCountry, formatDateTime, formatDuration } from '../../shared/formatters.js';

export function VisitSessionsTable({
  title,
  description,
  query,
  onPageChange,
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
    { key: 'entryPath', label: 'Entry page' },
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
    { key: 'pageCount', label: 'Pages' },
    { key: 'eventCount', label: 'Events' },
    {
      key: 'durationMs',
      label: 'Duration',
      render: record => formatDuration(record.durationMs),
    },
    {
      key: 'lastSeenAt',
      label: 'Last seen',
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
