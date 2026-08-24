import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UiCard } from '../primitives/UiCard.jsx';
import { UiSelect } from '../primitives/UiField.jsx';

const COLOR_SENT = '#f0060d';
const COLOR_REPLIED = '#7904fd';
const COLOR_NO_REPLY = '#ffb020';
const PIE_COLORS = [COLOR_REPLIED, COLOR_SENT, COLOR_NO_REPLY, '#0ea5e9', '#22c55e', '#64748b'];
const DEFAULT_LINES = [
  { dataKey: 'sent', name: 'Sent', color: COLOR_SENT },
  { dataKey: 'repliesObtained', name: 'Replies obtained', color: COLOR_REPLIED },
];

export function AdminMetricChart({
  title,
  description,
  range,
  ranges = [],
  points = [],
  pie = [],
  lines = DEFAULT_LINES,
  pieAriaLabel = 'Metric split',
  emptyMessage = 'No data available for the selected range.',
  pieEmptyMessage = 'No split data available yet.',
  onRangeChange,
  tone = 'default',
}) {
  const hasData =
    points.length > 0 && points.some(point => lines.some(line => (point[line.dataKey] || 0) > 0));
  const hasPieData = pie.some(item => (item.value || 0) > 0);

  return (
    <UiCard className="admin-metric-chart" tone={tone}>
      <div className="admin-metric-chart__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {ranges.length > 0 && (
          <UiSelect
            id="admin-chart-range"
            label="Range"
            value={range}
            onChange={event => onRangeChange?.(event.target.value)}
          >
            {ranges.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </UiSelect>
        )}
      </div>

      <div className="admin-metric-chart__plots">
        <div className="admin-metric-chart__plot" role="img" aria-label={title}>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(12, 0, 46, 0.08)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(12, 0, 46, 0.62)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(12, 0, 46, 0.14)' }}
                  tickLine={{ stroke: 'rgba(12, 0, 46, 0.14)' }}
                  angle={points.length > 10 ? -45 : 0}
                  textAnchor={points.length > 10 ? 'end' : 'middle'}
                  height={points.length > 10 ? 60 : 30}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'rgba(12, 0, 46, 0.62)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(12, 0, 46, 0.14)' }}
                  tickLine={{ stroke: 'rgba(12, 0, 46, 0.14)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid rgba(12, 0, 46, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1rem 2rem rgba(4, 0, 18, 0.12)',
                    color: '#0c002e',
                  }}
                  itemStyle={{ color: '#0c002e' }}
                  labelStyle={{ color: 'rgba(12, 0, 46, 0.62)', marginBottom: '0.25rem' }}
                />
                <Legend wrapperStyle={{ paddingTop: '1rem' }} iconType="circle" />
                {lines.map(line => (
                  <Line
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    name={line.name}
                    stroke={line.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-metric-chart__empty">{emptyMessage}</div>
          )}
        </div>
        <div className="admin-metric-chart__pie" role="img" aria-label={pieAriaLabel}>
          {hasPieData ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="82%"
                  paddingAngle={3}
                >
                  {pie.map((item, index) => (
                    <Cell
                      key={item.label}
                      fill={item.color || PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid rgba(12, 0, 46, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1rem 2rem rgba(4, 0, 18, 0.12)',
                    color: '#0c002e',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '1rem' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-metric-chart__empty">{pieEmptyMessage}</div>
          )}
        </div>
      </div>
    </UiCard>
  );
}
