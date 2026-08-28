import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { UiStat } from '@ui/primitives/UiStat.jsx';
import { useVisitMetrics, useVisitSessions } from '../queries/visits/useVisitQueries.js';
import {
  PAGE_SIZE,
  VISIT_CHART_LINES,
  VISIT_CHART_RANGES,
  createEmptyTableData,
} from '../shared/constants.js';
import { ErrorCard } from '../shared/ErrorCard.jsx';
import {
  createReferrerRow,
  formatCountry,
  formatCountryBreakdown,
  formatDateTime,
  formatDuration,
} from '../shared/formatters.js';

export default function VisitsPage({ onSelectVisitSession }) {
  const [chartRange, setChartRange] = useState('30d');
  const [sessionPage, setSessionPage] = useState(1);
  const metricsQuery = useVisitMetrics(chartRange);
  const sessionsQuery = useVisitSessions(
    { page: sessionPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const metrics = metricsQuery.data;
  const summary = metrics?.summary;

  return (
    <div className="admin-content-grid">
      {metricsQuery.isError ? (
        <ErrorCard error={metricsQuery.error} onRetry={() => metricsQuery.refetch()} />
      ) : (
        <>
          <div className="admin-stats-grid">
            <UiStat label="Page views" value={summary?.total ?? '...'} tone="light" />
            <UiStat label="Visits" value={summary?.visits ?? '...'} tone="light" />
            <UiStat label="Today" value={summary?.today ?? '...'} tone="light" />
            <UiStat label="Countries" value={summary?.countries ?? '...'} tone="light" />
          </div>
          <AdminMetricChart
            title="Visits and page views"
            description="First-party traffic collected without storing raw IP addresses."
            range={chartRange}
            ranges={VISIT_CHART_RANGES}
            points={metrics?.points || []}
            pie={formatCountryBreakdown(metrics?.countryBreakdown || [])}
            lines={VISIT_CHART_LINES}
            pieAriaLabel="Visitor countries"
            emptyMessage="No visits available for the selected range."
            pieEmptyMessage="No country data available yet."
            onRangeChange={setChartRange}
            tone="light"
          />
          <AdminDataTable
            title="Top sources"
            description="UTM source or click-id attribution, falling back to referrer host or direct traffic."
            columns={getVisitSourceColumns()}
            rows={(metrics?.topSources || []).map(createReferrerRow)}
            emptyMessage="No source data found."
            tone="light"
          />
          <AdminDataTable
            title="Top referrers"
            description="Specific referrer URLs are stored on each visit; this table groups them by host."
            columns={getVisitReferrerColumns()}
            rows={(metrics?.topReferrers || []).map(createReferrerRow)}
            emptyMessage="No referrer data found."
            tone="light"
          />
          <AdminDataTable
            title="Top pages"
            columns={getVisitPageColumns()}
            rows={metrics?.topPages || []}
            emptyMessage="No page views found."
            tone="light"
          />
        </>
      )}
      {sessionsQuery.isError ? (
        <ErrorCard error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Recent visits"
          description="Open a row to view the ordered page journey for that visitor session."
          columns={getVisitSessionColumns()}
          rows={sessionsQuery.data?.records || []}
          pagination={{
            ...(sessionsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setSessionPage,
          }}
          emptyMessage="No visits found."
          onRowClick={onSelectVisitSession}
          tone="light"
        />
      )}
    </div>
  );
}

function getVisitPageColumns() {
  return [
    { key: 'path', label: 'Page' },
    { key: 'visits', label: 'Page views' },
    { key: 'uniqueVisitors', label: 'Visits' },
    {
      key: 'averageDurationMs',
      label: 'Avg. time',
      render: record => formatDuration(record.averageDurationMs),
    },
    {
      key: 'lastSeenAt',
      label: 'Last seen',
      render: record => formatDateTime(record.lastSeenAt),
    },
  ];
}

function getVisitReferrerColumns() {
  return [
    { key: 'label', label: 'Referrer' },
    { key: 'value', label: 'Page views' },
  ];
}

function getVisitSourceColumns() {
  return [
    { key: 'label', label: 'Source' },
    { key: 'value', label: 'Page views' },
  ];
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
