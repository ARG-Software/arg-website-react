import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { createEmptyTableData } from '../../shared/constants.js';
import { formatDateTime, formatDuration, formatLocation } from '../../shared/formatters.js';

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
      render: formatLocation,
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
    {
      key: 'trafficType',
      label: 'Traffic',
      render: formatTraffic,
    },
    {
      key: 'originName',
      label: 'Origin',
      render: formatOrigin,
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

function formatSource(record) {
  const source = record.source || (record.referrer ? '' : 'direct');
  const medium = record.medium ? ` / ${record.medium}` : '';

  return source ? `${source}${medium}` : '-';
}

function formatTraffic(record) {
  if (!record.trafficType || record.trafficType === 'N/A') return 'N/A';

  const suspected = record.trafficType === 'suspected_bot';
  const reason =
    record.trafficReason && record.trafficReason !== 'N/A'
      ? formatClassification(record.trafficReason)
      : '';

  return (
    <span
      className={`admin-visit-traffic admin-visit-traffic--${suspected ? 'suspected' : 'human'}`}
      title={reason || undefined}
    >
      <strong>{suspected ? 'Suspected bot' : 'Human'}</strong>
      {reason && <small>{reason}</small>}
    </span>
  );
}

function formatOrigin(record) {
  if (!record.originName || record.originName === 'N/A') return 'N/A';

  const originType =
    record.originType && record.originType !== 'N/A' ? formatClassification(record.originType) : '';

  return originType ? `${record.originName} · ${originType}` : record.originName;
}

function formatClassification(value) {
  return String(value)
    .split(',')
    .map(item => item.trim().replaceAll('_', ' '))
    .filter(Boolean)
    .join(', ');
}
