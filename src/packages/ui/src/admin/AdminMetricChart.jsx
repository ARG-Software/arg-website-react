import { UiCard } from '../primitives/UiCard.jsx';
import { UiSelect } from '../primitives/UiField.jsx';

export function AdminMetricChart({
  title,
  description,
  range,
  ranges = [],
  points = [],
  onRangeChange,
}) {
  const maxValue = Math.max(
    1,
    ...points.map(point => Math.max(point.sent || 0, point.replied || 0))
  );

  return (
    <UiCard className="admin-metric-chart">
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

      <div className="admin-metric-chart__plot" role="img" aria-label={title}>
        {points.map(point => (
          <div className="admin-metric-chart__group" key={point.label}>
            <div className="admin-metric-chart__bars">
              <span
                className="admin-metric-chart__bar admin-metric-chart__bar--sent"
                style={{ '--admin-chart-value': `${((point.sent || 0) / maxValue) * 100}%` }}
                title={`Sent: ${point.sent || 0}`}
              />
              <span
                className="admin-metric-chart__bar admin-metric-chart__bar--replied"
                style={{ '--admin-chart-value': `${((point.replied || 0) / maxValue) * 100}%` }}
                title={`Replied: ${point.replied || 0}`}
              />
            </div>
            <span className="admin-metric-chart__label">{point.label}</span>
          </div>
        ))}
      </div>

      <div className="admin-metric-chart__legend">
        <span className="admin-metric-chart__legend-item admin-metric-chart__legend-item--sent">
          Sent
        </span>
        <span className="admin-metric-chart__legend-item admin-metric-chart__legend-item--replied">
          Replied
        </span>
      </div>
    </UiCard>
  );
}
