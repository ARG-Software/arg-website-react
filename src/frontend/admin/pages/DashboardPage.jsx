import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { UiStat } from '@ui/primitives/UiStat.jsx';
import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { AdminTableFilters } from '../components/AdminTableFilters.jsx';
import { useDebouncedValue } from '../hooks/shared/useDebouncedValue.js';
import { getStatusLabel } from '../outreach.js';
import {
  useOutreachChart,
  useOutreachRecords,
  useOutreachSummary,
} from '../queries/outreach/useOutreachQueries.js';
import {
  CHART_RANGES,
  EMPTY_TABLE_FILTERS,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  createEmptyTableData,
} from '../shared/constants.js';
import { ErrorCard } from '../shared/ErrorCard.jsx';

export default function DashboardPage({ onSelectRecord }) {
  const [chartRange, setChartRange] = useState('30d');
  const [tablePage, setTablePage] = useState(1);
  const [tableSort, setTableSort] = useState({ sortBy: 'dateSent', sortDirection: 'desc' });
  const [tableFilters, setTableFilters] = useState(EMPTY_TABLE_FILTERS);
  const debouncedCompanyName = useDebouncedValue(tableFilters.companyName, SEARCH_DEBOUNCE_MS);
  const tableQueryFilters = createTableQueryFilters(tableFilters, debouncedCompanyName);

  const summaryQuery = useOutreachSummary();
  const chartQuery = useOutreachChart(chartRange);
  const tableQuery = useOutreachRecords(
    {
      scope: 'recent_sent',
      ...tableSort,
      ...tableQueryFilters,
      page: tablePage,
      pageSize: PAGE_SIZE,
    },
    { keepPrevious: true }
  );
  const summary = summaryQuery.data?.summary;

  function handleTableSortChange(sortBy) {
    setTablePage(1);
    setTableSort(current => createNextTableSort(current, sortBy));
  }

  function handleTableFilterChange(field, value) {
    setTablePage(1);
    setTableFilters(current => ({ ...current, [field]: value }));
  }

  return (
    <div className="admin-content-grid">
      {summaryQuery.isError || chartQuery.isError ? (
        <ErrorCard
          error={summaryQuery.error ?? chartQuery.error}
          onRetry={() => {
            summaryQuery.refetch();
            chartQuery.refetch();
          }}
        />
      ) : (
        <>
          <div className="admin-stats-grid">
            <UiStat label="Total" value={summary?.total ?? '...'} tone="light" />
            <UiStat label="Not sent" value={summary?.notSent ?? '...'} tone="light" />
            <UiStat label="Sent" value={summary?.sent ?? '...'} tone="light" />
            <UiStat label="Replies" value={summary?.repliesObtained ?? '...'} tone="light" />
          </div>
          <AdminMetricChart
            title="Reply outcomes"
            description="Reply split for outreach sent in the selected time range."
            range={chartRange}
            rangeId="admin-outreach-reply-chart-range"
            ranges={CHART_RANGES}
            pie={chartQuery.data?.pie || []}
            pieAriaLabel="Outreach reply outcomes"
            onRangeChange={setChartRange}
            mode="pie"
            tone="light"
          />
          <AdminMetricChart
            title="Sent and replies"
            description="Outbound volume and replies obtained for the selected time range."
            range={chartRange}
            rangeId="admin-outreach-volume-chart-range"
            ranges={CHART_RANGES}
            points={chartQuery.data?.points || []}
            onRangeChange={setChartRange}
            mode="line"
            tone="light"
          />
        </>
      )}
      {tableQuery.isError ? (
        <ErrorCard error={tableQuery.error} onRetry={() => tableQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Latest sent"
          filters={
            <AdminTableFilters filters={tableFilters} onFilterChange={handleTableFilterChange} />
          }
          columns={getRecordColumns()}
          rows={tableQuery.data?.records || []}
          sort={tableSort}
          onSortChange={handleTableSortChange}
          pagination={{
            ...(tableQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setTablePage,
          }}
          emptyMessage="No sent outreach records found."
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
