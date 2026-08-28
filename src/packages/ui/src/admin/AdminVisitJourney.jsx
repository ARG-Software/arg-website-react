export function AdminVisitJourney({ events = [] }) {
  if (!events.length) {
    return <div className="admin-metric-chart__empty">No events found for this visit.</div>;
  }

  return (
    <ol className="admin-visit-journey">
      {events.map(event => (
        <li
          key={`${event.sessionHash}-${event.type}-${event.sequence}-${event.name}`}
          className="admin-visit-journey__item"
        >
          <span className="admin-visit-journey__sequence">{event.sequence}</span>
          <div>
            <strong>{getEventTitle(event)}</strong>
            <span>{event.path}</span>
            <small>
              {formatDateTime(event.visitedAt)}
              {event.type === 'page_view' ? ` · ${formatDuration(event.durationMs)}` : ''}
            </small>
            {event.type === 'event' && <small>{formatEventParams(event.params)}</small>}
            {event.source && <small>Source: {formatJourneySource(event)}</small>}
            {event.campaign && <small>Campaign: {event.campaign}</small>}
            {event.referrer && <small>Referrer: {event.referrer}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function getEventTitle(event) {
  if (event.type === 'page_view') return event.title || event.path;
  if (event.name === 'scroll_depth') return `Scroll depth ${event.params?.percent || ''}%`;
  if (event.name === 'time_on_page') return 'Time on page';
  if (event.name === 'cta_click')
    return `CTA click${event.params?.cta_type ? `: ${event.params.cta_type}` : ''}`;

  return formatEventName(event.name);
}

function formatEventName(name) {
  return String(name || 'event')
    .replace(/_/g, ' ')
    .replace(/^./, character => character.toUpperCase());
}

function formatEventParams(params = {}) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null
  );
  if (!entries.length) return 'No event details';

  return entries.map(([key, value]) => `${formatEventName(key)}: ${value}`).join(' · ');
}

function formatJourneySource(event) {
  return `${event.source}${event.medium ? ` / ${event.medium}` : ''}`;
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
