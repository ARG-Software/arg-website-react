export function AdminVisitJourney({ events = [] }) {
  if (!events.length) {
    return <div className="admin-metric-chart__empty">No page views found for this visit.</div>;
  }

  return (
    <ol className="admin-visit-journey">
      {events.map(event => (
        <li key={`${event.sessionHash}-${event.sequence}`} className="admin-visit-journey__item">
          <span className="admin-visit-journey__sequence">{event.sequence}</span>
          <div>
            <strong>{event.title || event.path}</strong>
            <span>{event.path}</span>
            <small>
              {formatDateTime(event.visitedAt)} · {formatDuration(event.durationMs)}
            </small>
            {event.referrer && <small>Referrer: {event.referrer}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(durationMs) {
  const value = Math.round((Number(durationMs) || 0) / 1000);
  if (value < 60) return `${value}s`;

  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
