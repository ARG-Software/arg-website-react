import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiSelect } from '@ui/primitives/UiField.jsx';
import {
  useDeleteVisitSession,
  useVisitBreakdown,
  useVisitChart,
  useVisitSessions,
  useVisitStat,
} from '../queries/visits/useVisitQueries.js';
import {
  PAGE_SIZE,
  VISIT_CHART_SERIES_OPTIONS,
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

const DEFAULT_RANGE = 'this_month';
const STAT_CARDS = [
  { metric: 'page_views', label: 'Page views' },
  { metric: 'visits', label: 'Visits' },
  { metric: 'events', label: 'Events' },
  { metric: 'countries', label: 'Countries' },
];

export default function VisitsPage({ onSelectVisitSession }) {
  const [statRanges, setStatRanges] = useState(createDefaultStatRanges);
  const [chartRange, setChartRange] = useState(DEFAULT_RANGE);
  const [chartSeries, setChartSeries] = useState('all');
  const [countryRange, setCountryRange] = useState(DEFAULT_RANGE);
  const [sourcesRange, setSourcesRange] = useState(DEFAULT_RANGE);
  const [referrersRange, setReferrersRange] = useState(DEFAULT_RANGE);
  const [pagesRange, setPagesRange] = useState(DEFAULT_RANGE);
  const [sessionPage, setSessionPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const pageViewsStatQuery = useVisitStat('page_views', statRanges.page_views);
  const visitsStatQuery = useVisitStat('visits', statRanges.visits);
  const eventsStatQuery = useVisitStat('events', statRanges.events);
  const countriesStatQuery = useVisitStat('countries', statRanges.countries);
  const chartQuery = useVisitChart(chartRange, chartSeries);
  const countryQuery = useVisitBreakdown('countries', countryRange);
  const sourcesQuery = useVisitBreakdown('sources', sourcesRange);
  const referrersQuery = useVisitBreakdown('referrers', referrersRange);
  const pagesQuery = useVisitBreakdown('pages', pagesRange);
  const sessionsQuery = useVisitSessions(
    { page: sessionPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const deleteMutation = useDeleteVisitSession();
  const statQueries = {
    page_views: pageViewsStatQuery,
    visits: visitsStatQuery,
    events: eventsStatQuery,
    countries: countriesStatQuery,
  };

  function updateStatRange(metric, range) {
    setStatRanges(current => ({ ...current, [metric]: range }));
  }

  async function deleteVisit() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.sessionHash);
    setDeleteTarget(null);
    onSelectVisitSession(null);
  }

  return (
    <div className="admin-content-grid">
      <div className="admin-stats-grid">
        {STAT_CARDS.map(card => (
          <VisitStatCard
            key={card.metric}
            label={card.label}
            range={statRanges[card.metric]}
            query={statQueries[card.metric]}
            onRangeChange={range => updateStatRange(card.metric, range)}
          />
        ))}
      </div>
      <div className="admin-visit-analytics-grid">
        {chartQuery.isError ? (
          <ErrorCard error={chartQuery.error} onRetry={() => chartQuery.refetch()} />
        ) : (
          <AdminMetricChart
            title="Page views, visits, and events"
            description="First-party traffic collected without storing raw IP addresses."
            range={chartRange}
            rangeId="admin-visit-chart-range"
            ranges={VISIT_CHART_RANGES}
            points={chartQuery.data?.points || []}
            lines={getVisitChartLines(chartSeries)}
            emptyMessage="No analytics data available for the selected range."
            onRangeChange={setChartRange}
            controls={
              <UiSelect
                id="admin-visit-chart-series"
                label="Metric"
                value={chartSeries}
                onChange={event => setChartSeries(event.target.value)}
              >
                {VISIT_CHART_SERIES_OPTIONS.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </UiSelect>
            }
            mode="line"
            tone="light"
          />
        )}
        {countryQuery.isError ? (
          <ErrorCard error={countryQuery.error} onRetry={() => countryQuery.refetch()} />
        ) : (
          <AdminMetricChart
            title="Visitors by country"
            description="Country split for page views in the selected range."
            range={countryRange}
            rangeId="admin-visit-country-range"
            ranges={VISIT_CHART_RANGES}
            pie={formatCountryBreakdown(countryQuery.data?.records || [])}
            pieAriaLabel="Visitor countries"
            pieEmptyMessage="No country data available for the selected range."
            onRangeChange={setCountryRange}
            mode="pie"
            tone="light"
          />
        )}
      </div>
      {sourcesQuery.isError ? (
        <ErrorCard error={sourcesQuery.error} onRetry={() => sourcesQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Top sources"
          description="UTM source or click-id attribution, falling back to referrer host or direct traffic."
          filters={
            <RangeSelect
              id="admin-visit-sources-range"
              value={sourcesRange}
              onChange={setSourcesRange}
            />
          }
          columns={getVisitSourceColumns()}
          rows={(sourcesQuery.data?.records || []).map(createReferrerRow)}
          loading={sourcesQuery.isLoading}
          emptyMessage="No source data found."
          tone="light"
        />
      )}
      {referrersQuery.isError ? (
        <ErrorCard error={referrersQuery.error} onRetry={() => referrersQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Top referrers"
          description="Specific referrer URLs are stored on each visit; this table groups them by host."
          filters={
            <RangeSelect
              id="admin-visit-referrers-range"
              value={referrersRange}
              onChange={setReferrersRange}
            />
          }
          columns={getVisitReferrerColumns()}
          rows={(referrersQuery.data?.records || []).map(createReferrerRow)}
          loading={referrersQuery.isLoading}
          emptyMessage="No referrer data found."
          tone="light"
        />
      )}
      {pagesQuery.isError ? (
        <ErrorCard error={pagesQuery.error} onRetry={() => pagesQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Top pages"
          filters={
            <RangeSelect id="admin-visit-pages-range" value={pagesRange} onChange={setPagesRange} />
          }
          columns={getVisitPageColumns()}
          rows={pagesQuery.data?.records || []}
          loading={pagesQuery.isLoading}
          emptyMessage="No page views found."
          tone="light"
        />
      )}
      {sessionsQuery.isError ? (
        <ErrorCard error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Recent visits"
          description="Today and yesterday only. Open a row to view the ordered page journey."
          columns={getVisitSessionColumns()}
          rows={sessionsQuery.data?.records || []}
          pagination={{
            ...(sessionsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setSessionPage,
          }}
          emptyMessage="No visits found."
          onRowClick={onSelectVisitSession}
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
        title="Delete this visit?"
        cancelLabel="Keep visit"
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete visit'}
        confirmDisabled={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteVisit}
      >
        <p>This permanently removes the visit session and its journey events from analytics.</p>
        {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
      </ConfirmDialog>
    </div>
  );
}

function VisitStatCard({ label, range, query, onRangeChange }) {
  return (
    <UiCard className="admin-visit-stat-card" tone="light">
      <div className="admin-visit-stat-card__header">
        <span className="admin-visit-stat-card__label">{label}</span>
        <RangeSelect
          id={`admin-visit-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
          value={range}
          onChange={onRangeChange}
        />
      </div>
      <strong className="admin-visit-stat-card__value">
        {query.isError ? 'Error' : (query.data?.value ?? '...')}
      </strong>
    </UiCard>
  );
}

function RangeSelect({ id, value, onChange }) {
  return (
    <UiSelect id={id} label="Range" value={value} onChange={event => onChange(event.target.value)}>
      {VISIT_CHART_RANGES.map(item => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </UiSelect>
  );
}

function createDefaultStatRanges() {
  return Object.fromEntries(STAT_CARDS.map(card => [card.metric, DEFAULT_RANGE]));
}

function getVisitChartLines(series) {
  if (series === 'all') return VISIT_CHART_LINES;

  const dataKey = series === 'page_views' ? 'pageViews' : series;
  return VISIT_CHART_LINES.filter(line => line.dataKey === dataKey);
}

function getVisitPageColumns() {
  return [
    { key: 'path', label: 'Page' },
    { key: 'pageViews', label: 'Page views' },
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
