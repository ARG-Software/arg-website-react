import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { AdminMetricChart } from '@ui/admin/AdminMetricChart.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiSelect } from '@ui/primitives/UiField.jsx';
import {
  useDeleteVisitSession,
  useAllVisitSessions,
  useVisitBreakdown,
  useVisitChart,
  useVisitCountryBreakdown,
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

const DEFAULT_RANGE = 'this_week';
const COUNTRY_BREAKDOWN_PAGE_SIZE = 250;
const COUNTRY_DONUT_SLICE_COUNT = 6;
const COUNTRY_RANKING_PAGE_SIZE = 8;
const STAT_CARDS = [
  { metric: 'page_views', label: 'Page views' },
  { metric: 'visits', label: 'Visits' },
  { metric: 'events', label: 'Events' },
  { metric: 'countries', label: 'Countries' },
];

export default function VisitsPage({ view = 'dashboard', onSelectVisitSession }) {
  if (view === 'all') {
    return <AllVisitsPage onSelectVisitSession={onSelectVisitSession} />;
  }

  return <VisitsDashboard onSelectVisitSession={onSelectVisitSession} />;
}

function VisitsDashboard({ onSelectVisitSession }) {
  const [overviewRange, setOverviewRange] = useState(DEFAULT_RANGE);
  const [chartSeries, setChartSeries] = useState('all');
  const [countryPage, setCountryPage] = useState(1);
  const [sourcesRange, setSourcesRange] = useState(DEFAULT_RANGE);
  const [sourcesPage, setSourcesPage] = useState(1);
  const [referrersRange, setReferrersRange] = useState(DEFAULT_RANGE);
  const [referrersPage, setReferrersPage] = useState(1);
  const [pagesRange, setPagesRange] = useState(DEFAULT_RANGE);
  const [pagesPage, setPagesPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const pageViewsStatQuery = useVisitStat('page_views', overviewRange);
  const visitsStatQuery = useVisitStat('visits', overviewRange);
  const eventsStatQuery = useVisitStat('events', overviewRange);
  const countriesStatQuery = useVisitStat('countries', overviewRange);
  const chartQuery = useVisitChart(overviewRange, chartSeries);
  const countryQuery = useVisitCountryBreakdown(
    overviewRange,
    { pageSize: COUNTRY_BREAKDOWN_PAGE_SIZE },
    { keepPrevious: true }
  );
  const sourcesQuery = useVisitBreakdown(
    'sources',
    sourcesRange,
    { page: sourcesPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const referrersQuery = useVisitBreakdown(
    'referrers',
    referrersRange,
    { page: referrersPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const pagesQuery = useVisitBreakdown(
    'pages',
    pagesRange,
    { page: pagesPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
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
  const countryItems = formatCountryBreakdown(countryQuery.data?.records || []);

  function updateOverviewRange(range) {
    setOverviewRange(range);
    setCountryPage(1);
  }

  async function deleteVisit() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.sessionHash);
    setDeleteTarget(null);
    onSelectVisitSession(null);
  }

  return (
    <div className="admin-content-grid">
      <UiCard className="admin-visit-overview-card" tone="light">
        <div className="admin-visit-overview-card__header">
          <div>
            <h2>Visit overview</h2>
            <p>Summary for the selected time range.</p>
          </div>
          <RangeSelect
            id="admin-visit-overview-range"
            className="admin-visit-range-select--small"
            value={overviewRange}
            onChange={updateOverviewRange}
          />
        </div>
        <div className="admin-stats-grid">
          {STAT_CARDS.map(card => (
            <VisitStatCard key={card.metric} label={card.label} query={statQueries[card.metric]} />
          ))}
        </div>
      </UiCard>
      <div className="admin-visit-analytics-grid">
        {chartQuery.isError ? (
          <ErrorCard error={chartQuery.error} onRetry={() => chartQuery.refetch()} />
        ) : (
          <AdminMetricChart
            title="Page views, visits, and events"
            description="First-party traffic collected without storing raw IP addresses."
            points={chartQuery.data?.points || []}
            lines={getVisitChartLines(chartSeries)}
            emptyMessage="No analytics data available for the selected range."
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
        <div className="admin-visit-country-column">
          {countryQuery.isError ? (
            <ErrorCard error={countryQuery.error} onRetry={() => countryQuery.refetch()} />
          ) : (
            <>
              <AdminMetricChart
                title="Visitors by country"
                description="Country split for visits in the selected range."
                pie={getCountryChartItems(countryItems)}
                pieAriaLabel="Visitor countries"
                pieLegendMode="none"
                pieEmptyMessage="No country data available for the selected range."
                mode="pie"
                tone="light"
              >
                <CountrySummary items={countryItems} />
              </AdminMetricChart>
              <CountryRankingCard
                items={countryItems}
                page={countryPage}
                onPageChange={setCountryPage}
              />
            </>
          )}
        </div>
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
              className="admin-visit-range-select--tiny"
              value={sourcesRange}
              onChange={range => updatePagedRange(setSourcesRange, setSourcesPage, range)}
            />
          }
          filtersClassName="admin-data-table__filters--compact"
          columns={getVisitSourceColumns()}
          rows={(sourcesQuery.data?.records || []).map(createReferrerRow)}
          loading={sourcesQuery.isLoading}
          pagination={getTablePagination(sourcesQuery, setSourcesPage)}
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
              className="admin-visit-range-select--tiny"
              value={referrersRange}
              onChange={range => updatePagedRange(setReferrersRange, setReferrersPage, range)}
            />
          }
          filtersClassName="admin-data-table__filters--compact"
          columns={getVisitReferrerColumns()}
          rows={(referrersQuery.data?.records || []).map(createReferrerRow)}
          loading={referrersQuery.isLoading}
          pagination={getTablePagination(referrersQuery, setReferrersPage)}
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
            <RangeSelect
              id="admin-visit-pages-range"
              className="admin-visit-range-select--tiny"
              value={pagesRange}
              onChange={range => updatePagedRange(setPagesRange, setPagesPage, range)}
            />
          }
          filtersClassName="admin-data-table__filters--compact"
          columns={getVisitPageColumns()}
          rows={pagesQuery.data?.records || []}
          loading={pagesQuery.isLoading}
          pagination={getTablePagination(pagesQuery, setPagesPage)}
          emptyMessage="No page views found."
          tone="light"
        />
      )}
      {sessionsQuery.isError ? (
        <ErrorCard error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (
        <VisitSessionsTable
          title="Recent visits"
          description="Today and yesterday only. Open a row to view the ordered page journey."
          query={sessionsQuery}
          onPageChange={setSessionPage}
          onSelectVisitSession={onSelectVisitSession}
          onDelete={setDeleteTarget}
          deleteMutation={deleteMutation}
        />
      )}
      <VisitDeleteDialog
        deleteTarget={deleteTarget}
        deleteMutation={deleteMutation}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteVisit}
      />
    </div>
  );
}

function AllVisitsPage({ onSelectVisitSession }) {
  const [sessionPage, setSessionPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sessionsQuery = useAllVisitSessions(
    { page: sessionPage, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const deleteMutation = useDeleteVisitSession();

  async function deleteVisit() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.sessionHash);
    setDeleteTarget(null);
    onSelectVisitSession(null);
  }

  return (
    <div className="admin-content-grid">
      {sessionsQuery.isError ? (
        <ErrorCard error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (
        <VisitSessionsTable
          title="All visits"
          description="Every recorded visit, ordered by latest activity. Open a row to view the ordered page journey."
          query={sessionsQuery}
          onPageChange={setSessionPage}
          onSelectVisitSession={onSelectVisitSession}
          onDelete={setDeleteTarget}
          deleteMutation={deleteMutation}
        />
      )}
      <VisitDeleteDialog
        deleteTarget={deleteTarget}
        deleteMutation={deleteMutation}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteVisit}
      />
    </div>
  );
}

function VisitSessionsTable({
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
      pagination={getTablePagination(query, onPageChange)}
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

function VisitDeleteDialog({ deleteTarget, deleteMutation, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      isOpen={Boolean(deleteTarget)}
      title="Delete this visit?"
      cancelLabel="Keep visit"
      confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete visit'}
      confirmDisabled={deleteMutation.isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>This permanently removes the visit session and its journey events from analytics.</p>
      {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
    </ConfirmDialog>
  );
}

function CountrySummary({ items }) {
  const totalVisits = items.reduce((total, item) => total + Number(item.value || 0), 0);
  const topCountry = items[0];

  return (
    <div className="admin-country-summary" aria-label="Country visit summary">
      <CountrySummaryMetric label="Total visits" value={totalVisits.toLocaleString()} />
      <CountrySummaryMetric label="Countries" value={items.length.toLocaleString()} />
      <CountrySummaryMetric label="Top country" value={topCountry?.label || '-'} />
      <CountrySummaryMetric label="Top visits" value={(topCountry?.value || 0).toLocaleString()} />
    </div>
  );
}

function CountrySummaryMetric({ label, value }) {
  return (
    <div className="admin-country-summary__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CountryRankingCard({ items, page, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(items.length / COUNTRY_RANKING_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * COUNTRY_RANKING_PAGE_SIZE;
  const pageItems = items.slice(start, start + COUNTRY_RANKING_PAGE_SIZE);

  return (
    <UiCard className="admin-country-ranking-card" tone="light">
      <div className="admin-country-ranking-card__header">
        <div>
          <h2>Country ranking</h2>
          <p>Countries ordered by visit count.</p>
        </div>
      </div>
      {pageItems.length > 0 ? (
        <ol className="admin-country-ranking-list" aria-label="Countries by visits">
          {pageItems.map((item, index) => (
            <li key={item.label} className="admin-country-ranking-list__item">
              <span className="admin-country-ranking-list__rank">
                {String(start + index + 1).padStart(2, '0')}
              </span>
              <span className="admin-country-ranking-list__country">{item.label}</span>
              <strong className="admin-country-ranking-list__visits">
                {Number(item.value || 0).toLocaleString()} visits
              </strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="admin-country-ranking-card__empty">No country visits found.</div>
      )}
      {totalPages > 1 && (
        <div className="admin-country-ranking-card__pagination">
          <UiButton
            className="admin-country-ranking-card__button"
            variant="secondary"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </UiButton>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <UiButton
            className="admin-country-ranking-card__button"
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </UiButton>
        </div>
      )}
    </UiCard>
  );
}

function VisitStatCard({ label, query }) {
  return (
    <UiCard className="admin-visit-stat-card" tone="light">
      <div className="admin-visit-stat-card__header">
        <span className="admin-visit-stat-card__label">{label}</span>
      </div>
      <strong className="admin-visit-stat-card__value">
        {query.isError ? 'Error' : (query.data?.value ?? '...')}
      </strong>
    </UiCard>
  );
}

function RangeSelect({ id, className = '', value, onChange }) {
  return (
    <UiSelect
      id={id}
      className={['admin-visit-range-select', className].filter(Boolean).join(' ')}
      label="Range"
      labelHidden
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {VISIT_CHART_RANGES.map(item => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </UiSelect>
  );
}

function updatePagedRange(setRange, setPage, range) {
  setRange(range);
  setPage(1);
}

function getTablePagination(query, onPageChange) {
  return {
    ...(query.data?.pagination ?? createEmptyTableData().pagination),
    onPageChange,
  };
}

function getVisitChartLines(series) {
  if (series === 'all') return VISIT_CHART_LINES;

  const dataKey = series === 'page_views' ? 'pageViews' : series;
  return VISIT_CHART_LINES.filter(line => line.dataKey === dataKey);
}

function getCountryChartItems(items) {
  if (items.length <= COUNTRY_DONUT_SLICE_COUNT + 1) return items;

  const visibleItems = items.slice(0, COUNTRY_DONUT_SLICE_COUNT);
  const otherVisits = items
    .slice(COUNTRY_DONUT_SLICE_COUNT)
    .reduce((total, item) => total + Number(item.value || 0), 0);

  return [...visibleItems, { label: 'Other countries', value: otherVisits }];
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
