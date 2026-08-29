import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { AdminTableFilters } from '../../components/outreach/AdminTableFilters.jsx';
import { useDebouncedValue } from '../../hooks/shared/useDebouncedValue.js';
import { getStatusLabel } from '../../outreach.js';
import { useOutreachRecords } from '../../queries/outreach/useOutreachQueries.js';
import {
  EMPTY_TABLE_FILTERS,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  createEmptyTableData,
} from '../../shared/constants.js';
import { ErrorCard } from '../../shared/ErrorCard.jsx';

export default function OutreachRecordsPage({ title, query = {}, emptyMessage, onSelectRecord }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortDirection: 'desc' });
  const [filters, setFilters] = useState(EMPTY_TABLE_FILTERS);
  const debouncedCompanyName = useDebouncedValue(filters.companyName, SEARCH_DEBOUNCE_MS);
  const queryFilters = createTableQueryFilters(filters, debouncedCompanyName);

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

  function handleSortChange(sortBy) {
    setPage(1);
    setSort(current => createNextTableSort(current, sortBy));
  }

  function handleFilterChange(field, value) {
    setPage(1);
    setFilters(current => ({ ...current, [field]: value }));
  }

  return (
    <div className="admin-content-grid">
      {recordsQuery.isError ? (
        <ErrorCard error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title={title}
          filters={<AdminTableFilters filters={filters} onFilterChange={handleFilterChange} />}
          columns={getRecordColumns()}
          rows={recordsQuery.data?.records || []}
          sort={sort}
          onSortChange={handleSortChange}
          pagination={{
            ...(recordsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage={emptyMessage}
          onRowClick={onSelectRecord}
          tone="light"
        />
      )}
    </div>
  );
}

function getRecordColumns() {
  return [
    { key: 'companyName', label: 'Company', sortable: true },
    {
      key: 'contactEmail',
      label: 'Contact',
      render: record => record.contactEmail || record.contactInfo || record.website || 'No contact',
    },
    {
      key: 'status',
      label: 'Status',
      render: record => (
        <UiStatusPill status={record.status}>{getStatusLabel(record.status)}</UiStatusPill>
      ),
    },
    {
      key: 'dateSent',
      label: 'Date sent',
      sortable: true,
      render: record => record.dateSent || '-',
    },
    {
      key: 'followUpDate',
      label: 'Follow up',
      sortable: true,
      render: record => record.followUpDate || '-',
    },
  ];
}

function createNextTableSort(current, sortBy) {
  return {
    sortBy,
    sortDirection: current.sortBy === sortBy && current.sortDirection === 'asc' ? 'desc' : 'asc',
  };
}

function createTableQueryFilters(filters, companyName) {
  return {
    companyName,
    dateSentFrom: filters.dateSentFrom,
    dateSentTo: filters.dateSentTo,
  };
}
