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

export function AdminMetricChart({
  title,
  description,
  range,
  ranges = [],
  points = [],
  pie = [],
  onRangeChange,
  tone = 'default',
}) {
  const hasData =
    points.length > 0 &&
    points.some(point => (point.sent || 0) > 0 || (point.repliesObtained || 0) > 0);
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
                <Line
                  type="monotone"
                  dataKey="sent"
                  name="Sent"
                  stroke={COLOR_SENT}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLOR_SENT, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="repliesObtained"
                  name="Replies obtained"
                  stroke={COLOR_REPLIED}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLOR_REPLIED, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-metric-chart__empty">
              No data available for the selected range.
            </div>
          )}
        </div>
        <div className="admin-metric-chart__pie" role="img" aria-label="Reply outcome split">
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
                  {pie.map(item => (
                    <Cell
                      key={item.label}
                      fill={item.label === 'Replies obtained' ? COLOR_REPLIED : COLOR_NO_REPLY}
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
            <div className="admin-metric-chart__empty">No sent records to split yet.</div>
          )}
        </div>
      </div>
    </UiCard>
  );
}
